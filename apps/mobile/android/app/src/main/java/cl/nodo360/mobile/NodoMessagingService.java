package cl.nodo360.mobile;

import android.content.Intent;
import android.os.Build;

import androidx.core.content.ContextCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

public class NodoMessagingService extends FirebaseMessagingService {
    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        Map<String, String> data = remoteMessage.getData();
        if (data == null || data.isEmpty()) return;
        if (!"RADIO_TX".equals(data.get("kind"))) return;
        if (isAppForeground()) return;

        Intent intent = RadioPlaybackService.buildIntent(
            this,
            data.get("txId"),
            data.get("incidentId"),
            data.get("speakerName"),
            data.get("audioUrl"),
            data.get("code"),
            data.get("type")
        );
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ContextCompat.startForegroundService(this, intent);
        } else {
            startService(intent);
        }
    }

    private boolean isAppForeground() {
        return getSharedPreferences("nodo360_mobile_state", MODE_PRIVATE)
            .getBoolean("appForeground", false);
    }
}
