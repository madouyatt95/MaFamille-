import UIKit
import Capacitor
import FirebaseCore

extension Notification.Name {
    static let myFamilyPlusQuickMicroRequested = Notification.Name("myFamilyPlusQuickMicroRequested")
}

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        if FirebaseApp.app() == nil {
            FirebaseApp.configure()
        }
        application.shortcutItems = [
            UIApplicationShortcutItem(type: "fr.myfamilyplus.app.micro", localizedTitle: "Ouvrir le micro", localizedSubtitle: "Parler à MyFamily+", icon: UIApplicationShortcutIcon(systemImageName: "mic.fill")),
            UIApplicationShortcutItem(type: "fr.myfamilyplus.app.receipt", localizedTitle: "Scanner un ticket", localizedSubtitle: "Lecture locale", icon: UIApplicationShortcutIcon(systemImageName: "doc.text.viewfinder")),
            UIApplicationShortcutItem(type: "fr.myfamilyplus.app.homework", localizedTitle: "Scanner un devoir", localizedSubtitle: "Photo ou document", icon: UIApplicationShortcutIcon(systemImageName: "text.viewfinder")),
            UIApplicationShortcutItem(type: "fr.myfamilyplus.app.expense", localizedTitle: "J’ai payé", localizedSubtitle: "Ajouter une dépense", icon: UIApplicationShortcutIcon(systemImageName: "eurosign.circle.fill")),
            UIApplicationShortcutItem(type: "fr.myfamilyplus.app.vault", localizedTitle: "Coffre-fort", localizedSubtitle: "Documents du foyer", icon: UIApplicationShortcutIcon(systemImageName: "lock.doc.fill"))
        ]
        if let shortcut = launchOptions?[.shortcutItem] as? UIApplicationShortcutItem {
            handleHomeScreenShortcut(shortcut)
        }
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        NotificationCenter.default.post(name: .myFamilyPlusQuickMicroRequested, object: nil)
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        if handleMyFamilyPlusURL(url) {
            return true
        }
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        if let url = userActivity.webpageURL, handleMyFamilyPlusURL(url) {
            return true
        }
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    func application(_ application: UIApplication, performActionFor shortcutItem: UIApplicationShortcutItem, completionHandler: @escaping (Bool) -> Void) {
        completionHandler(handleHomeScreenShortcut(shortcutItem))
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

    private func handleMyFamilyPlusURL(_ url: URL) -> Bool {
        let isCustomScheme = url.scheme?.lowercased() == "myfamilyplus"
        let isUniversalLink = (url.scheme?.lowercased() == "https" || url.scheme?.lowercased() == "http")
            && ["myfamilyplus.fr", "www.myfamilyplus.fr"].contains(url.host?.lowercased() ?? "")
        guard isCustomScheme || isUniversalLink else {
            return false
        }

        let components = URLComponents(url: url, resolvingAgainstBaseURL: false)
        let host = url.host?.lowercased()
        let path = url.path.lowercased()
        let pathParts = path.split(separator: "/")
        let pathAction = pathParts.dropFirst().first.map(String.init)?.lowercased()
        let action = components?.queryItems?.first(where: { $0.name.lowercased() == "action" })?.value?.lowercased()
            ?? (path.hasPrefix("/action/") ? pathAction : nil)

        let allowedActions: Set<String> = [
            "open-micro",
            "paid",
            "add-expense",
            "scan-receipt",
            "scan-homework",
            "add-grocery",
            "open-vault",
            "share-intake",
            "share-receipt",
            "arrival-home",
            "arrival-store",
            "arrival-school"
        ]

        guard host == "quick-micro" || path == "/quick-micro" || host == "quick-expense" || path == "/quick-expense" || action == "open-micro" || (action != nil && allowedActions.contains(action!)) else {
            return false
        }

        let resolvedAction: String
        if host == "quick-micro" || path == "/quick-micro" {
            resolvedAction = "open-micro"
        } else if host == "quick-expense" || path == "/quick-expense" {
            resolvedAction = "add-expense"
        } else {
            resolvedAction = action ?? "open-micro"
        }
        MyFamilyQuickActionStore.enqueue(action: resolvedAction, query: components?.percentEncodedQuery ?? "action=\(resolvedAction)")
        NotificationCenter.default.post(name: .myFamilyPlusQuickMicroRequested, object: nil)
        return true
    }

    private func handleHomeScreenShortcut(_ item: UIApplicationShortcutItem) -> Bool {
        let actions: [String: String] = [
            "fr.myfamilyplus.app.micro": "open-micro",
            "fr.myfamilyplus.app.receipt": "scan-receipt",
            "fr.myfamilyplus.app.homework": "scan-homework",
            "fr.myfamilyplus.app.expense": "paid",
            "fr.myfamilyplus.app.vault": "open-vault"
        ]
        guard let action = actions[item.type] else { return false }
        MyFamilyQuickActionStore.enqueue(action: action, query: "action=\(action)")
        NotificationCenter.default.post(name: .myFamilyPlusQuickMicroRequested, object: nil)
        return true
    }

}
