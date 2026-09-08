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
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

@CapacitorPlugin(name = "NativeAlarm")
public class NativeAlarmPlugin extends Plugin {
    private static final Pattern CODE_PATTERN = Pattern.compile("10[-_ ]?(1[0-2]|[0-9])");
    private static final long[] VIBRATION = {0, 900, 350, 900, 350, 1400};

    private static final String[] CODES = {
        "10-0", "10-1", "10-2", "10-3", "10-4", "10-5", "10-6",
        "10-7", "10-8", "10-9", "10-10", "10-11", "10-12"
    };

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
        Context context = getContext();
        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launch == null) {
            call.reject("No se encontró la actividad principal");
            return;
        }
        launch.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            360,
            launch,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Uri sound = soundUri(code);
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle(call.getString("title", "PRUEBA ALARMA " + code))
            .setContentText(call.getString("body", "Prueba local de tono crítico Nodo360"))
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setVibrate(VIBRATION)
            .setSound(sound)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent);

        NotificationManager manager =
            (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        boolean canFullScreen = Build.VERSION.SDK_INT < 34 || manager.canUseFullScreenIntent();
        if (canFullScreen) {
            builder.setFullScreenIntent(pendingIntent, true);
        }
        try {
            NotificationManagerCompat.from(context).notify(10360, builder.build());
            JSObject result = new JSObject();
            result.put("code", code);
            result.put("channelId", channelId);
            result.put("fullScreenRequested", canFullScreen);
            call.resolve(result);
        } catch (SecurityException error) {
            call.reject("Notificaciones no autorizadas", error);
        }
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
                "Alarma " + code,
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Tono operativo " + code + " de Nodo360");
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
        Matcher matcher = CODE_PATTERN.matcher(value == null ? "" : value);
        return matcher.find() ? "10-" + matcher.group(1) : "10-0";
    }

    private String channelId(String code) {
        return "nodo360_alarm_" + code.replace('-', '_');
    }

    private Uri soundUri(String code) {
        String name = "tone_" + code.replace('-', '_');
        return Uri.parse("android.resource://" + getContext().getPackageName() + "/raw/" + name);
    }
}
