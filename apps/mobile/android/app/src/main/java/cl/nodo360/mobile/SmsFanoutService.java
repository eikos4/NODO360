package cl.nodo360.mobile;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import android.telephony.SmsManager;

import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;

public class SmsFanoutService extends Service {
    private static final String CHANNEL_ID = "nodo360_sms_gateway";
    private static final int NOTIFICATION_ID = 36062;

    public static void start(Context context, String incidentId) {
        if (incidentId == null || incidentId.trim().isEmpty()) return;
        if (!SmsBackupPrefs.isGatewayEnabled(context)) return;
        Intent intent = new Intent(context, SmsFanoutService.class);
        intent.putExtra("incidentId", incidentId.trim());
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent);
        } else {
            context.startService(intent);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        startForegroundCompat();
        String incidentId = intent != null ? intent.getStringExtra("incidentId") : null;
        new Thread(() -> {
            try {
                fanout(incidentId);
            } finally {
                stopSelf();
            }
        }, "nodo360-sms-fanout").start();
        return START_NOT_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void fanout(String incidentId) {
        if (incidentId == null || incidentId.isEmpty()) return;
        if (!SmsBackupPrefs.consumeFanout(this, incidentId)) return;
        String token = SmsBackupPrefs.token(this);
        if (token == null || token.isEmpty()) return;
        try {
            JSONObject payload = fetchBackup(incidentId, token);
            if (payload == null) return;
            String smsBody = payload.optString("smsBody", "");
            if (smsBody.isEmpty()) return;
            JSONArray phones = payload.optJSONArray("phones");
            if (phones == null || phones.length() == 0) return;
            SmsManager manager = SmsManager.getDefault();
            ArrayList<String> parts = manager.divideMessage(smsBody);
            int max = Math.min(phones.length(), 80);
            for (int i = 0; i < max; i++) {
                String phone = phones.optString(i, "").trim();
                if (phone.isEmpty()) continue;
                try {
                    if (parts.size() > 1) {
                        manager.sendMultipartTextMessage(phone, null, parts, null, null);
                    } else {
                        manager.sendTextMessage(phone, null, smsBody, null, null);
                    }
                    Thread.sleep(350);
                } catch (Exception ignored) { /* número inválido o SMS bloqueado */ }
            }
        } catch (Exception ignored) { /* sin red en el celular pasarela */ }
    }

    private JSONObject fetchBackup(String incidentId, String token) throws Exception {
        URL url = new URL(SmsBackupPrefs.apiUrl(this) + "/emergency-response/" + incidentId + "/sms-backup");
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("GET");
        conn.setRequestProperty("Authorization", "Bearer " + token);
        conn.setConnectTimeout(12_000);
        conn.setReadTimeout(12_000);
        int code = conn.getResponseCode();
        InputStream stream = code >= 200 && code < 300 ? conn.getInputStream() : conn.getErrorStream();
        String body = read(stream);
        conn.disconnect();
        if (code < 200 || code >= 300) return null;
        return new JSONObject(body);
    }

    private static String read(InputStream stream) throws Exception {
        if (stream == null) return "";
        BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8));
        StringBuilder builder = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) builder.append(line);
        return builder.toString();
    }

    private void startForegroundCompat() {
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "SMS de respaldo Nodo360",
                NotificationManager.IMPORTANCE_LOW
            );
            manager.createNotificationChannel(channel);
        }
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_email)
            .setContentTitle("Nodo360")
            .setContentText("Enviando alarma por SMS")
            .setOngoing(true)
            .build();
        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }
}
