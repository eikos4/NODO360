package cl.nodo360.mobile;

import android.content.Context;
import android.content.SharedPreferences;

final class SmsBackupPrefs {
    private static final String PREFS = "nodo360_sms_backup";
    private static final String RECEIVE = "receiveEnabled";
    private static final String GATEWAY = "gatewayEnabled";
    private static final String API_URL = "apiUrl";
    private static final String TOKEN = "token";
    private static final String FANOUT_PREFIX = "fanout:";

    private SmsBackupPrefs() {}

    static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static boolean isReceiveEnabled(Context context) {
        return prefs(context).getBoolean(RECEIVE, false);
    }

    static boolean isGatewayEnabled(Context context) {
        return prefs(context).getBoolean(GATEWAY, false);
    }

    static void setReceiveEnabled(Context context, boolean value) {
        prefs(context).edit().putBoolean(RECEIVE, value).apply();
    }

    static void setGatewayEnabled(Context context, boolean value) {
        prefs(context).edit().putBoolean(GATEWAY, value).apply();
    }

    static void setApiConfig(Context context, String apiUrl, String token) {
        SharedPreferences.Editor editor = prefs(context).edit();
        if (apiUrl != null && !apiUrl.trim().isEmpty()) {
            editor.putString(API_URL, apiUrl.trim().replaceAll("/+$", ""));
        }
        if (token != null) {
            editor.putString(TOKEN, token.trim());
        }
        editor.apply();
    }

    static String apiUrl(Context context) {
        return prefs(context).getString(API_URL, "https://nodo360-api.onrender.com/api");
    }

    static String token(Context context) {
        return prefs(context).getString(TOKEN, "");
    }

    static boolean consumeFanout(Context context, String incidentId) {
        if (incidentId == null || incidentId.trim().isEmpty()) return false;
        String key = FANOUT_PREFIX + incidentId.trim();
        long at = prefs(context).getLong(key, 0);
        long now = System.currentTimeMillis();
        if (at > 0 && now - at < 10 * 60 * 1000L) return false;
        prefs(context).edit().putLong(key, now).apply();
        return true;
    }
}
