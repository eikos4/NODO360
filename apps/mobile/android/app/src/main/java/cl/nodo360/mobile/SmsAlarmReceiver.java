package cl.nodo360.mobile;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.provider.Telephony;
import android.telephony.SmsMessage;

import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class SmsAlarmReceiver extends BroadcastReceiver {
    private static final Pattern ID_PATTERN = Pattern.compile("#([A-Za-z0-9_-]{6,})");
    private static final Pattern CODE_PATTERN = Pattern.compile("10[-_ ]?(1[0-2]|\\d)");

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !Telephony.Sms.Intents.SMS_RECEIVED_ACTION.equals(intent.getAction())) {
            return;
        }
        if (!SmsBackupPrefs.isReceiveEnabled(context)) return;

        String body = readBody(intent);
        if (body == null) return;
        String trimmed = body.trim();
        if (!trimmed.toUpperCase(Locale.ROOT).startsWith("NODO360")) return;

        String id = extractId(trimmed);
        String code = extractCode(trimmed);
        String spoken = trimmed.replaceFirst("(?i)^NODO360\\s*", "").replaceFirst("#\\S+$", "").trim();
        if (spoken.isEmpty()) spoken = trimmed;
        int notifyId = Math.abs((id != null ? id : trimmed).hashCode()) % 900_000 + 10_000;

        AlarmPlayback.play(
            context,
            code,
            "ALARMA " + code,
            spoken,
            "Atención. " + spoken,
            notifyId,
            1,
            id != null ? id : ("sms:" + trimmed)
        );
    }

    private static String readBody(Intent intent) {
        StringBuilder builder = new StringBuilder();
        Bundle extras = intent.getExtras();
        if (extras == null) return null;
        Object[] pdus = (Object[]) extras.get("pdus");
        if (pdus == null || pdus.length == 0) return null;
        String format = extras.getString("format");
        for (Object pdu : pdus) {
            SmsMessage message = format != null
                ? SmsMessage.createFromPdu((byte[]) pdu, format)
                : SmsMessage.createFromPdu((byte[]) pdu);
            if (message == null) continue;
            String part = message.getMessageBody();
            if (part != null) builder.append(part);
        }
        String body = builder.toString().trim();
        return body.isEmpty() ? null : body;
    }

    private static String extractId(String body) {
        Matcher matcher = ID_PATTERN.matcher(body);
        return matcher.find() ? matcher.group(1) : null;
    }

    private static String extractCode(String body) {
        if (body.toUpperCase(Locale.ROOT).contains("NODO") && !CODE_PATTERN.matcher(body).find()) {
            return "NODO";
        }
        Matcher matcher = CODE_PATTERN.matcher(body);
        return matcher.find() ? "10-" + matcher.group(1) : "10-0";
    }
}
