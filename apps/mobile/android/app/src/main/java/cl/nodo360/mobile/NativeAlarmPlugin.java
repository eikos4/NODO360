package cl.nodo360.mobile;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "NativeAlarm",
    permissions = {
        @Permission(
            alias = "sms",
            strings = {
                Manifest.permission.RECEIVE_SMS,
                Manifest.permission.READ_SMS,
                Manifest.permission.SEND_SMS
            }
        )
    }
)
public class NativeAlarmPlugin extends Plugin {
    @Override
    public void load() {
        super.load();
        AlarmPlayback.createChannels(getContext());
    }

    @Override
    protected void handleOnDestroy() {
        AlarmPlayback.stop();
        super.handleOnDestroy();
    }

    @PluginMethod
    public void configure(PluginCall call) {
        AlarmPlayback.createChannels(getContext());
        applySmsConfig(call);
        getDiagnostics(call);
    }

    @PluginMethod
    public void configureSmsBackup(PluginCall call) {
        applySmsConfig(call);
        call.resolve(smsState());
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
            for (String code : AlarmPlayback.CODES) {
                String id = AlarmPlayback.channelId(code);
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
        AlarmPlayback.createChannels(getContext());
        String code = AlarmPlayback.normalizeCode(call.getString("code", "10-0"));
        int notifyId = call.getInt("notificationId", 10360);
        int repeatCount = Math.max(1, call.getInt("repeatCount", 1));
        try {
            AlarmPlayback.play(
                getContext(),
                code,
                call.getString("title", "PRUEBA ALARMA " + code),
                call.getString("body", "Prueba local de tono crítico Nodo360"),
                call.getString("spoken"),
                notifyId,
                repeatCount,
                call.getString("id")
            );
            JSObject result = new JSObject();
            result.put("code", code);
            result.put("channelId", AlarmPlayback.channelId(code));
            call.resolve(result);
        } catch (Exception error) {
            call.reject("No se pudo emitir la alarma", error);
        }
    }

    @PluginMethod
    public void getSmsBackupState(PluginCall call) {
        call.resolve(smsState());
    }

    @PluginMethod
    public void requestSmsBackup(PluginCall call) {
        if (getPermissionState("sms") != PermissionState.GRANTED) {
            requestPermissionForAlias("sms", call, "onSmsPermission");
            return;
        }
        SmsBackupPrefs.setReceiveEnabled(getContext(), true);
        call.resolve(smsState());
    }

    @PermissionCallback
    private void onSmsPermission(PluginCall call) {
        boolean granted = getPermissionState("sms") == PermissionState.GRANTED;
        if (granted) SmsBackupPrefs.setReceiveEnabled(getContext(), true);
        JSObject result = smsState();
        result.put("granted", granted);
        call.resolve(result);
    }

    @PluginMethod
    public void setSmsGateway(PluginCall call) {
        boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        if (enabled && getPermissionState("sms") != PermissionState.GRANTED) {
            requestPermissionForAlias("sms", call, "onGatewayPermission");
            return;
        }
        SmsBackupPrefs.setGatewayEnabled(getContext(), enabled);
        if (enabled) SmsBackupPrefs.setReceiveEnabled(getContext(), true);
        applySmsConfig(call);
        call.resolve(smsState());
    }

    @PermissionCallback
    private void onGatewayPermission(PluginCall call) {
        boolean granted = getPermissionState("sms") == PermissionState.GRANTED;
        SmsBackupPrefs.setGatewayEnabled(getContext(), granted);
        if (granted) SmsBackupPrefs.setReceiveEnabled(getContext(), true);
        JSObject result = smsState();
        result.put("granted", granted);
        call.resolve(result);
    }

    @PluginMethod
    public void sendBackupSms(PluginCall call) {
        applySmsConfig(call);
        String incidentId = call.getString("incidentId", "");
        if (SmsBackupPrefs.isGatewayEnabled(getContext()) && incidentId != null && !incidentId.isEmpty()) {
            SmsFanoutService.start(getContext(), incidentId);
        }
        call.resolve(smsState());
    }

    @PluginMethod
    public void testSmsAlarm(PluginCall call) {
        String code = AlarmPlayback.normalizeCode(call.getString("code", "10-0"));
        String spoken = "Atención. Diez " + code.replace("10-", "") + ". Prueba de alarma por SMS, sin internet.";
        AlarmPlayback.play(
            getContext(),
            code,
            "ALARMA " + code,
            "Prueba SMS Nodo360",
            spoken,
            10361,
            1,
            "sms-test:" + System.currentTimeMillis()
        );
        call.resolve(smsState());
    }

    private void applySmsConfig(PluginCall call) {
        String apiUrl = call.getString("apiUrl");
        String token = call.getString("token");
        if ((apiUrl != null && !apiUrl.isEmpty()) || (token != null && !token.isEmpty())) {
            SmsBackupPrefs.setApiConfig(getContext(), apiUrl, token);
        }
    }

    private JSObject smsState() {
        Context context = getContext();
        boolean permission = getPermissionState("sms") == PermissionState.GRANTED
            || (
                ContextCompat.checkSelfPermission(context, Manifest.permission.RECEIVE_SMS)
                    == PackageManager.PERMISSION_GRANTED
            );
        JSObject result = new JSObject();
        result.put("permission", permission);
        result.put("receiveEnabled", SmsBackupPrefs.isReceiveEnabled(context));
        result.put("gatewayEnabled", SmsBackupPrefs.isGatewayEnabled(context));
        return result;
    }

    private void openSettings(String action) {
        startActivity(new Intent(action));
    }

    private void startActivity(Intent intent) {
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
    }
}
