package cl.nodo360.mobile;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.speech.tts.TextToSpeech;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class AlarmPlayback {
    private static final Pattern CODE_PATTERN = Pattern.compile("10[-_ ]?(1[0-2]|[0-9])");
    private static final long[] VIBRATION = {0, 900, 350, 900, 350, 1400};
    private static final String PLAYED_PREFS = "nodo360_alarm_played";
    private static final long PLAYED_TTL_MS = 10 * 60 * 1000L;
    static final String[] CODES = {
        "10-0", "10-1", "10-2", "10-3", "10-4", "10-5", "10-6",
        "10-7", "10-8", "10-9", "10-10", "10-11", "10-12", "NODO"
    };

    private static final Handler MAIN = new Handler(Looper.getMainLooper());
    private static TextToSpeech tts;
    private static boolean ttsReady = false;
    private static String pendingSpeech;
    private static MediaPlayer player;

    private AlarmPlayback() {}

    static boolean consumeId(Context context, String id) {
        if (id == null || id.trim().isEmpty()) return true;
        String key = id.trim();
        android.content.SharedPreferences prefs =
            context.getSharedPreferences(PLAYED_PREFS, Context.MODE_PRIVATE);
        long at = prefs.getLong(key, 0);
        long now = System.currentTimeMillis();
        if (at > 0 && now - at < PLAYED_TTL_MS) return false;
        prefs.edit().putLong(key, now).apply();
        return true;
    }

    static void play(
        Context context,
        String codeValue,
        String title,
        String body,
        String spoken,
        int notificationId,
        int repeatCount,
        String id
    ) {
        Context app = context.getApplicationContext();
        if (!consumeId(app, id)) return;
        createChannels(app);
        String code = normalizeCode(codeValue);
        String channelId = channelId(code);
        ensureTts(app);

        Intent launch = app.getPackageManager().getLaunchIntentForPackage(app.getPackageName());
        if (launch == null) return;
        launch.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            app,
            notificationId,
            launch,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(app, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle(title == null || title.isEmpty() ? "ALARMA " + code : title)
            .setContentText(body == null || body.isEmpty() ? "Despacho operativo Nodo360" : body)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setSilent(true)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent);

        NotificationManager manager =
            (NotificationManager) app.getSystemService(Context.NOTIFICATION_SERVICE);
        boolean canFullScreen = Build.VERSION.SDK_INT < 34 || manager.canUseFullScreenIntent();
        if (canFullScreen) {
            builder.setFullScreenIntent(pendingIntent, true);
        }
        try {
            NotificationManagerCompat.from(app).notify(notificationId, builder.build());
        } catch (SecurityException ignored) { /* sin permiso de notificaciones */ }
        vibrate(app);
        playToneThenSpeak(app, code, spoken, Math.max(1, repeatCount));
    }

    static void createChannels(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager =
            (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        boolean policyAccess = manager.isNotificationPolicyAccessGranted();
        AudioAttributes attributes = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();
        for (String code : CODES) {
            NotificationChannel channel = new NotificationChannel(
                channelId(code),
                "NODO".equals(code) ? "Aviso Nodo360" : "Alarma " + code,
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription(
                "NODO".equals(code)
                    ? "Ident Nodo360 — preaviso extraordinario"
                    : "Tono operativo " + code + " de Nodo360"
            );
            channel.setSound(soundUri(context, code), attributes);
            channel.enableVibration(true);
            channel.setVibrationPattern(VIBRATION);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            if (policyAccess) channel.setBypassDnd(true);
            manager.createNotificationChannel(channel);
        }
    }

    static void stop() {
        MAIN.removeCallbacksAndMessages(null);
        stopTone();
        if (tts != null) {
            tts.stop();
            tts.shutdown();
            tts = null;
            ttsReady = false;
        }
    }

    static String normalizeCode(String value) {
        String raw = value == null ? "" : value;
        if (raw.toUpperCase(Locale.ROOT).matches(".*(NODO|STANDBY|PREAVISO).*")) {
            return "NODO";
        }
        Matcher matcher = CODE_PATTERN.matcher(raw);
        return matcher.find() ? "10-" + matcher.group(1) : "10-0";
    }

    static String channelId(String code) {
        if ("NODO".equals(code)) return "nodo360_alarm_nodo360";
        return "nodo360_alarm_" + code.replace('-', '_');
    }

    private static void ensureTts(Context context) {
        if (tts != null) return;
        tts = new TextToSpeech(context.getApplicationContext(), status -> {
            if (status != TextToSpeech.SUCCESS || tts == null) return;
            int lang = tts.setLanguage(new Locale("es", "CL"));
            if (lang == TextToSpeech.LANG_MISSING_DATA || lang == TextToSpeech.LANG_NOT_SUPPORTED) {
                tts.setLanguage(new Locale("es", "ES"));
            }
            tts.setSpeechRate(0.92f);
            ttsReady = true;
            if (pendingSpeech != null) {
                speakNow(pendingSpeech);
                pendingSpeech = null;
            }
        });
    }

    private static void playToneThenSpeak(Context context, String code, String spoken, int repeatCount) {
        stopTone();
        List<Integer> queue = new ArrayList<>();
        int ident = rawRes(context, "tone_nodo360");
        if ("NODO".equals(code)) {
            for (int i = 0; i < repeatCount; i++) {
                if (ident != 0) queue.add(ident);
            }
        } else {
            if (ident != 0) queue.add(ident);
            int tone = rawRes(context, "tone_" + code.replace('-', '_'));
            if (tone != 0) queue.add(tone);
        }
        if (queue.isEmpty()) {
            scheduleSpeech(spoken, 800);
            return;
        }
        playQueue(context, queue, 0, spoken);
    }

    private static void playQueue(Context context, List<Integer> queue, int index, String spoken) {
        if (index >= queue.size()) {
            scheduleSpeech(spoken, 250);
            return;
        }
        try {
            player = MediaPlayer.create(context, queue.get(index));
            if (player == null) {
                playQueue(context, queue, index + 1, spoken);
                return;
            }
            player.setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build());
            player.setVolume(1f, 1f);
            player.setOnCompletionListener(mp -> {
                stopTone();
                playQueue(context, queue, index + 1, spoken);
            });
            player.start();
        } catch (Exception error) {
            scheduleSpeech(spoken, 800);
        }
    }

    private static int rawRes(Context context, String name) {
        return context.getResources().getIdentifier(name, "raw", context.getPackageName());
    }

    private static void scheduleSpeech(String spoken, int delayMs) {
        if (spoken == null || spoken.trim().isEmpty()) return;
        MAIN.postDelayed(() -> speakNow(spoken), delayMs);
    }

    private static void speakNow(String text) {
        if (!ttsReady || tts == null) {
            pendingSpeech = text;
            return;
        }
        tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "nodo360-alarm");
    }

    private static void stopTone() {
        if (player == null) return;
        try {
            if (player.isPlaying()) player.stop();
        } catch (Exception ignored) { /* already released */ }
        player.release();
        player = null;
    }

    private static void vibrate(Context context) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                VibratorManager manager =
                    (VibratorManager) context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                manager.getDefaultVibrator().vibrate(
                    VibrationEffect.createWaveform(VIBRATION, -1)
                );
                return;
            }
            Vibrator vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator == null) return;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(VIBRATION, -1));
            } else {
                vibrator.vibrate(VIBRATION, -1);
            }
        } catch (Exception ignored) { /* fabricante sin vibrador */ }
    }

    private static Uri soundUri(Context context, String code) {
        String name = "NODO".equals(code) ? "tone_nodo360" : "tone_" + code.replace('-', '_');
        return Uri.parse("android.resource://" + context.getPackageName() + "/raw/" + name);
    }
}
