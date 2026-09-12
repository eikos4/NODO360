import AVFoundation
import Capacitor
import UIKit
import UserNotifications

@objc(NativeAlarmPlugin)
public class NativeAlarmPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeAlarmPlugin"
    public let jsName = "NativeAlarm"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "configure", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getDiagnostics", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestCriticalAlerts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openNotificationSettings", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "testAlarm", returnType: CAPPluginReturnPromise)
    ]

    @objc func configure(_ call: CAPPluginCall) {
        Self.registerCategories()
        diagnostics(call)
    }

    @objc func getDiagnostics(_ call: CAPPluginCall) {
        diagnostics(call)
    }

    @objc func openNotificationSettings(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let url = URL(string: UIApplication.openSettingsURLString) else {
                call.reject("No se pudo abrir la configuración de notificaciones")
                return
            }
            UIApplication.shared.open(url) { _ in call.resolve() }
        }
    }

    @objc func requestCriticalAlerts(_ call: CAPPluginCall) {
        let enabled = Bundle.main.object(
            forInfoDictionaryKey: "Nodo360CriticalAlertsEnabled"
        ) as? Bool ?? false
        guard enabled else {
            call.reject("Critical Alerts no está habilitado: requiere aprobación y entitlement de Apple.")
            return
        }
        UNUserNotificationCenter.current().requestAuthorization(
            options: [.alert, .badge, .sound, .criticalAlert]
        ) { granted, error in
            if let error {
                call.reject("Apple rechazó la solicitud: \(error.localizedDescription)")
                return
            }
            call.resolve(["granted": granted])
        }
    }

    @objc func testAlarm(_ call: CAPPluginCall) {
        let code = Self.normalizedCode(call.getString("code") ?? "10-0")
        let content = UNMutableNotificationContent()
        content.title = call.getString("title") ?? "PRUEBA ALARMA \(code)"
        content.body = call.getString("body") ?? "Prueba local de tono Nodo360"
        content.categoryIdentifier = "NODO360_EMERGENCY"

        let soundName = "tone_\(code.replacingOccurrences(of: "-", with: "_")).caf"
        let hasBundledSound = Bundle.main.url(forResource: soundName, withExtension: nil) != nil
        content.sound = hasBundledSound ? UNNotificationSound(named: UNNotificationSoundName(soundName)) : .default

        let request = UNNotificationRequest(
            identifier: "nodo360-local-test",
            content: content,
            trigger: UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
        )
        if let spoken = call.getString("spoken"), !spoken.isEmpty {
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.2) {
                let utterance = AVSpeechUtterance(string: spoken)
                utterance.voice = AVSpeechSynthesisVoice(language: "es-CL")
                    ?? AVSpeechSynthesisVoice(language: "es-ES")
                utterance.rate = AVSpeechUtteranceDefaultSpeechRate * 0.92
                self.synthesizer.speak(utterance)
            }
        }
        UNUserNotificationCenter.current().add(request) { error in
            if let error {
                call.reject("No se pudo programar la prueba: \(error.localizedDescription)")
                return
            }
            call.resolve([
                "code": code,
                "bundledCustomSound": hasBundledSound,
                "note": hasBundledSound
                    ? "Prueba programada con tono CAF."
                    : "Prueba programada con sonido estándar; falta convertir/copiar el CAF."
            ])
        }
    }

    private func diagnostics(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            let status: String
            switch settings.authorizationStatus {
            case .authorized: status = "authorized"
            case .provisional: status = "provisional"
            case .ephemeral: status = "ephemeral"
            case .denied: status = "denied"
            case .notDetermined: status = "notDetermined"
            @unknown default: status = "unknown"
            }
            call.resolve([
                "platform": "ios",
                "notificationsGranted": settings.authorizationStatus == .authorized
                    || settings.authorizationStatus == .provisional
                    || settings.authorizationStatus == .ephemeral,
                "authorizationStatus": status,
                "criticalAlertsAuthorized": settings.criticalAlertSetting == .enabled,
                "criticalAlertsEnabled": Bundle.main.object(
                    forInfoDictionaryKey: "Nodo360CriticalAlertsEnabled"
                ) as? Bool ?? false,
                "note": "Las alertas críticas requieren aprobación de Apple y un perfil con el entitlement."
            ])
        }
    }

    private let synthesizer = AVSpeechSynthesizer()

    static func registerCategories() {
        let open = UNNotificationAction(
            identifier: "OPEN_EMERGENCY",
            title: "Abrir emergencia",
            options: [.foreground]
        )
        let category = UNNotificationCategory(
            identifier: "NODO360_EMERGENCY",
            actions: [open],
            intentIdentifiers: [],
            options: [.customDismissAction]
        )
        UNUserNotificationCenter.current().setNotificationCategories([category])
    }

    private static func normalizedCode(_ value: String) -> String {
        let pattern = #"10[-_ ]?(1[0-2]|[0-9])"#
        guard let regex = try? NSRegularExpression(pattern: pattern),
              let match = regex.firstMatch(
                in: value,
                range: NSRange(value.startIndex..., in: value)
              ),
              let range = Range(match.range(at: 1), in: value) else {
            return "10-0"
        }
        return "10-\(value[range])"
    }
}
