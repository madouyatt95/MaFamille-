import Foundation
import Capacitor

class BridgeViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleQuickMicroRequest),
            name: .myFamilyPlusQuickMicroRequested,
            object: nil
        )
    }

    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(NativeSpeechPlugin())
        bridge?.registerPluginInstance(AppStoreBillingPlugin())
        bridge?.registerPluginInstance(LocalOcrPlugin())
        bridge?.registerPluginInstance(SharedInboxPlugin())
        flushPendingQuickMicroRequest()
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    @objc private func handleQuickMicroRequest() {
        flushPendingQuickMicroRequest()
    }

    private func flushPendingQuickMicroRequest() {
        let pending = MyFamilyQuickActionStore.consume()
        let legacyMicro = UserDefaults.standard.bool(forKey: "mf_pending_quick_micro_native")
        let pendingAction = pending?.action ?? (legacyMicro ? "open-micro" : nil)
        let pendingQuery = pending?.query

        guard let pendingAction else {
            return
        }
        UserDefaults.standard.removeObject(forKey: "mf_pending_quick_micro_native")

        let delays: [TimeInterval] = pendingAction == "open-micro" ? [0.0, 0.35] : [0.0]
        delays.forEach { delay in
            DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
                let script: String
                if pendingAction == "open-micro" {
                    script = """
                    try {
                      sessionStorage.setItem('mf_pending_quick_micro', 'true');
                      localStorage.setItem('mf_pending_quick_micro', 'true');
                      window.dispatchEvent(new CustomEvent('myfamilyplus:quick-micro'));
                    } catch (error) {
                      window.location.href = '/quick-micro';
                    }
                    """
                } else {
                    let query = pendingQuery?.isEmpty == false ? pendingQuery! : "action=\(pendingAction)"
                    let safeQuery = query
                        .replacingOccurrences(of: "\\", with: "\\\\")
                        .replacingOccurrences(of: "'", with: "\\'")
                    let safeAction = pendingAction
                        .replacingOccurrences(of: "\\", with: "\\\\")
                        .replacingOccurrences(of: "'", with: "\\'")
                    script = """
                    try {
                      sessionStorage.setItem('mf_pending_system_quick_action', '\(safeAction)');
                      localStorage.setItem('mf_pending_system_quick_action', '\(safeAction)');
                      sessionStorage.setItem('mf_pending_system_quick_action_query', '\(safeQuery)');
                      localStorage.setItem('mf_pending_system_quick_action_query', '\(safeQuery)');
                      window.dispatchEvent(new CustomEvent('myfamilyplus:system-action', { detail: { action: '\(safeAction)', query: '\(safeQuery)' } }));
                    } catch (error) {
                      window.location.href = '/app?\(safeQuery)';
                    }
                    """
                }
                self?.bridge?.webView?.evaluateJavaScript(script, completionHandler: nil)
            }
        }
    }
}
