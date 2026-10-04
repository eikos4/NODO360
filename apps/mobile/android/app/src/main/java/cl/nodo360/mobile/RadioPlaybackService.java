package cl.nodo360.mobile;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.IBinder;

import androidx.core.app.NotificationCompat;

import java.util.ArrayDeque;
import java.util.Iterator;
import java.util.LinkedHashSet;
import java.util.Set;

public class RadioPlaybackService extends Service {
    private static final String CHANNEL_ID = "nodo360_radio_background";
    private static final int NOTIFICATION_ID = 36061;
    private static final int MAX_RECENT_IDS = 48;
    private static final ArrayDeque<ClipPayload> QUEUE = new ArrayDeque<>();
    private static final Set<String> RECENT_IDS = new LinkedHashSet<>();

    private MediaPlayer player;

    public static Intent buildIntent(
        Context context,
        String txId,
        String incidentId,
        String speakerName,
        String audioUrl,
        String code,
        String type
    ) {
        Intent intent = new Intent(context, RadioPlaybackService.class);
        intent.putExtra("txId", safe(txId));
        intent.putExtra("incidentId", safe(incidentId));
        intent.putExtra("speakerName", safe(speakerName));
        intent.putExtra("audioUrl", safe(audioUrl));
        intent.putExtra("code", safe(code));
        intent.putExtra("type", safe(type));
        return intent;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        enqueue(intent);
        startForegroundCompat(buildNotification("Radio Nodo360", "Escucha operativa en segundo plano"));
        if (player == null) playNext();
        return START_NOT_STICKY;
    }

    @Override
    public void onDestroy() {
        releasePlayer();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void enqueue(Intent intent) {
        if (intent == null) return;
        String txId = safe(intent.getStringExtra("txId"));
        String audioUrl = safe(intent.getStringExtra("audioUrl"));
        if (txId.isEmpty() || audioUrl.isEmpty()) return;
        synchronized (QUEUE) {
            if (RECENT_IDS.contains(txId)) return;
            RECENT_IDS.add(txId);
            trimRecentIds();
            QUEUE.add(new ClipPayload(
                txId,
                safe(intent.getStringExtra("incidentId")),
                safe(intent.getStringExtra("speakerName")),
                audioUrl,
                safe(intent.getStringExtra("code")),
                safe(intent.getStringExtra("type"))
            ));
        }
    }

    private void trimRecentIds() {
        if (RECENT_IDS.size() <= MAX_RECENT_IDS) return;
        Iterator<String> it = RECENT_IDS.iterator();
        while (RECENT_IDS.size() > MAX_RECENT_IDS && it.hasNext()) {
            it.next();
            it.remove();
        }
    }

    private void playNext() {
        ClipPayload next;
        synchronized (QUEUE) {
            next = QUEUE.poll();
        }
        if (next == null) {
            stopForeground(true);
            stopSelf();
            return;
        }

        startForegroundCompat(buildNotification(
            next.speakerName.isEmpty() ? "Radio Nodo360" : next.speakerName,
            next.summary()
        ));
        releasePlayer();
        try {
            player = new MediaPlayer();
            player.setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                .build());
            player.setDataSource(next.audioUrl);
            player.setOnPreparedListener(MediaPlayer::start);
            player.setOnCompletionListener(mp -> {
                releasePlayer();
                playNext();
            });
            player.setOnErrorListener((mp, what, extra) -> {
                releasePlayer();
                playNext();
                return true;
            });
            player.prepareAsync();
        } catch (Exception ignored) {
            releasePlayer();
            playNext();
        }
    }

    private void releasePlayer() {
        if (player == null) return;
        try {
            if (player.isPlaying()) player.stop();
        } catch (Exception ignored) { /* already stopped */ }
        player.release();
        player = null;
    }

    private void createChannelIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null || manager.getNotificationChannel(CHANNEL_ID) != null) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Radio Nodo360 en segundo plano",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("Reproduce transmisiones operativas cuando la app esta cerrada");
        channel.setSound(null, null);
        channel.enableVibration(false);
        manager.createNotificationChannel(channel);
    }

    private void startForegroundCompat(Notification notification) {
        createChannelIfNeeded();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            return;
        }
        startForeground(NOTIFICATION_ID, notification);
    }

    private Notification buildNotification(String title, String body) {
        Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pendingIntent = null;
        if (launch != null) {
            launch.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            pendingIntent = PendingIntent.getActivity(
                this,
                NOTIFICATION_ID,
                launch,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_sys_speakerphone)
            .setContentTitle(title)
            .setContentText(body)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);
        if (pendingIntent != null) builder.setContentIntent(pendingIntent);
        return builder.build();
    }

    private static String safe(String value) {
        return value == null ? "" : value.trim();
    }

    private static final class ClipPayload {
        final String txId;
        final String incidentId;
        final String speakerName;
        final String audioUrl;
        final String code;
        final String type;

        ClipPayload(String txId, String incidentId, String speakerName, String audioUrl, String code, String type) {
            this.txId = txId;
            this.incidentId = incidentId;
            this.speakerName = speakerName;
            this.audioUrl = audioUrl;
            this.code = code;
            this.type = type;
        }

        String summary() {
            String left = code.isEmpty() ? "Radio de emergencia" : code;
            String right = type.isEmpty() ? "Transmision recibida" : type;
            return left + " · " + right;
        }
    }
}
