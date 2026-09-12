package cl.nodo360.mobile;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.provider.Settings;
import android.speech.tts.TextToSpeech;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@CapacitorPlugin(name = "NativeAlarm")
public class NativeAlarmPlugin extends Plugin {
    private static final Pattern CODE_PATTERN = Pattern.compile("10[-_ ]?(1[0-2]|[0-9])");
    private static final long[] VIBRATION = {0, 900, 350, 900, 350, 1400};

    private static final String[] CODES = {
        "10-0", "10-1", "10-2", "10-3", "10-4", "10-5", "10-6",
        "10-7", "10-8", "10-9", "10-10", "10-11", "10-12", "NODO"
    };

    private TextToSpeech tts;
    private boolean ttsReady = false;
    private String pendingSpeech;
    private MediaPlayer player;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @Override
    public void load() {
        super.load();
        tts = new TextToSpeech(getContext(), status -> {
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

    @Override
    protected void handleOnDestroy() {
        mainHandler.removeCallbacksAndMessages(null);
        stopTone();
        if (tts != null) {
            tts.stop();
            tts.shutdown();
            tts = null;
        }
        super.handleOnDestroy();
    }

    @PluginMethod
    public void configure(PluginCall call) {
        createChannels();
        getDiagnostics(call);
    }

    @PluginMethod
    public void getDiagnostics(PluginCall call) {
        Context context = getContext();
        NotificationManager manager =
            (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        boolean notificationsGranted = Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU
            || ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS)
                == PackageManager.PERMISSION_GRANTED;
        boolean policyAccess = manager.isNotificationPolicyAccessGranted();
        boolean fullScreenAllowed = true;
        if (Build.VERSION.SDK_INT >= 34) {
            fullScreenAllowed = manager.canUseFullScreenIntent();
        }
        boolean batteryOptimized = false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            android.os.PowerManager power =
                (android.os.PowerManager) context.getSystemService(Context.POWER_SERVICE);
            batteryOptimized = !power.isIgnoringBatteryOptimizations(context.getPackageName());
        }

        JSArray channels = new JSArray();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            for (String code : CODES) {
                String id = channelId(code);
                NotificationChannel channel = manager.getNotificationChannel(id);
                JSObject item = new JSObject();
                item.put("id", id);
                item.put("code", code);
                item.put("exists", channel != null);
                if (channel != null) {
                    item.put("importance", channel.getImportance());
                    item.put("sound", channel.getSound() == null ? null : channel.getSound().toString());
                    item.put("vibration", channel.shouldVibrate());
                    item.put("bypassDnd", channel.canBypassDnd());
                }
                channels.put(item);
            }
        }

        JSObject result = new JSObject();
        result.put("platform", "android");
        result.put("notificationsGranted", notificationsGranted);
        result.put("notificationPolicyAccess", policyAccess);
        result.put("fullScreenIntentAllowed", fullScreenAllowed);
        result.put("batteryOptimized", batteryOptimized);
        result.put("channels", channels);
        call.resolve(result);
    }

    @PluginMethod
    public void openDndSettings(PluginCall call) {
        openSettings(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS);
        call.resolve();
    }

    @PluginMethod
    public void openNotificationSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
            .putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
        startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void openFullScreenSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 34) {
            Intent intent = new Intent(
                Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT,
                Uri.parse("package:" + getContext().getPackageName())
            );
            startActivity(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void openBatterySettings(PluginCall call) {
        openSettings(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
        call.resolve();
    }

    @PluginMethod
    public void testAlarm(PluginCall call) {
        createChannels();
        String code = normalizeCode(call.getString("code", "10-0"));
        String channelId = channelId(code);
        String spoken = call.getString("spoken");
        int notifyId = call.getInt("notificationId", 10360);
        Context context = getContext();
        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launch == null) {
            call.reject("No se encontró la actividad principal");
            return;
        }
        launch.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            notifyId,
            launch,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle(call.getString("title", "PRUEBA ALARMA " + code))
            .setContentText(call.getString("body", "Prueba local de tono crítico Nodo360"))
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setSilent(true)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent);

        NotificationManager manager =
            (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        boolean canFullScreen = Build.VERSION.SDK_INT < 34 || manager.canUseFullScreenIntent();
        if (canFullScreen) {
            builder.setFullScreenIntent(pendingIntent, true);
        }
        try {
            NotificationManagerCompat.from(context).notify(notifyId, builder.build());
            vibrate(context);
            playToneThenSpeak(code, spoken);
            JSObject result = new JSObject();
            result.put("code", code);
            result.put("channelId", channelId);
            result.put("fullScreenRequested", canFullScreen);
            call.resolve(result);
        } catch (SecurityException error) {
            call.reject("Notificaciones no autorizadas", error);
        }
    }

    private void playToneThenSpeak(String code, String spoken) {
        stopTone();
        List<Integer> queue = new ArrayList<>();
        int ident = rawRes("tone_nodo360");
        if (ident != 0) queue.add(ident);
        if (!"NODO".equals(code)) {
            int tone = rawRes("tone_" + code.replace('-', '_'));
            if (tone != 0) queue.add(tone);
        }
        if (queue.isEmpty()) {
            scheduleSpeech(spoken, 800);
            return;
        }
        playQueue(queue, 0, spoken);
    }

    private void playQueue(List<Integer> queue, int index, String spoken) {
        if (index >= queue.size()) {
            scheduleSpeech(spoken, 250);
            return;
        }
        try {
            player = MediaPlayer.create(getContext(), queue.get(index));
            if (player == null) {
                playQueue(queue, index + 1, spoken);
                return;
            }
            player.setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build());
            player.setVolume(1f, 1f);
            player.setOnCompletionListener(mp -> {
                stopTone();
                playQueue(queue, index + 1, spoken);
            });
            player.start();
        } catch (Exception error) {
            scheduleSpeech(spoken, 800);
        }
    }

    private int rawRes(String name) {
        return getContext().getResources().getIdentifier(name, "raw", getContext().getPackageName());
    }

    private void scheduleSpeech(String spoken, int delayMs) {
        if (spoken == null || spoken.trim().isEmpty()) return;
        mainHandler.postDelayed(() -> speakNow(spoken), delayMs);
    }

    private void speakNow(String text) {
        if (!ttsReady || tts == null) {
            pendingSpeech = text;
            return;
        }
        tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "nodo360-alarm");
    }

    private void stopTone() {
        if (player == null) return;
        try {
            if (player.isPlaying()) player.stop();
        } catch (Exception ignored) { /* already released */ }
        player.release();
        player = null;
    }

    private void vibrate(Context context) {
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

    private void createChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        Context context = getContext();
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
            channel.setSound(soundUri(code), attributes);
            channel.enableVibration(true);
            channel.setVibrationPattern(VIBRATION);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            if (policyAccess) channel.setBypassDnd(true);
            manager.createNotificationChannel(channel);
        }
    }

    private void openSettings(String action) {
        startActivity(new Intent(action));
    }

    private void startActivity(Intent intent) {
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
    }

    private String normalizeCode(String value) {
        String raw = value == null ? "" : value;
        if (raw.toUpperCase(Locale.ROOT).matches(".*(NODO|STANDBY|PREAVISO).*")) {
            return "NODO";
        }
        Matcher matcher = CODE_PATTERN.matcher(raw);
        return matcher.find() ? "10-" + matcher.group(1) : "10-0";
    }

    private String channelId(String code) {
        if ("NODO".equals(code)) return "nodo360_alarm_nodo360";
        return "nodo360_alarm_" + code.replace('-', '_');
    }

    private Uri soundUri(String code) {
        String name = "NODO".equals(code) ? "tone_nodo360" : "tone_" + code.replace('-', '_');
        return Uri.parse("android.resource://" + getContext().getPackageName() + "/raw/" + name);
    }
}
