package cl.nodo360.mobile;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.webkit.WebSettings;
import android.webkit.WebView;

import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String APP_STATE_PREFS = "nodo360_mobile_state";
    private static final String APP_FOREGROUND_KEY = "appForeground";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this).setKeepOnScreenCondition(() -> false);
        registerPlugin(NativeAlarmPlugin.class);
        super.onCreate(savedInstanceState);
        setAppForeground(true);
        applyOpaqueSystemBars();
        revealWebView();
    }

    @Override
    public void onResume() {
        super.onResume();
        setAppForeground(true);
        applyOpaqueSystemBars();
        revealWebView();
    }

    @Override
    public void onStop() {
        setAppForeground(false);
        super.onStop();
    }

    @Override
    public void onDestroy() {
        setAppForeground(false);
        super.onDestroy();
    }

    private void setAppForeground(boolean value) {
        getSharedPreferences(APP_STATE_PREFS, MODE_PRIVATE)
            .edit()
            .putBoolean(APP_FOREGROUND_KEY, value)
            .apply();
    }

    private void applyOpaqueSystemBars() {
        Window window = getWindow();
        WindowCompat.setDecorFitsSystemWindows(window, true);
        window.setStatusBarColor(Color.parseColor("#F8FAFC"));
        window.setNavigationBarColor(Color.parseColor("#FFFFFF"));
        WindowInsetsControllerCompat insets = new WindowInsetsControllerCompat(window, window.getDecorView());
        insets.setAppearanceLightStatusBars(true);
        insets.setAppearanceLightNavigationBars(true);
    }

    private void revealWebView() {
        if (getBridge() == null || getBridge().getWebView() == null) return;
        WebView web = getBridge().getWebView();
        web.setVisibility(View.VISIBLE);
        web.setBackgroundColor(Color.parseColor("#F8FAFC"));
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setTextZoom(100);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        web.requestLayout();
        web.invalidate();
    }
}
