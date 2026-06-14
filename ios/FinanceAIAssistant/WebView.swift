import SwiftUI
import WebKit
import UIKit

struct WebAppView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        configuration.userContentController.add(context.coordinator, name: "auditDownload")

        let webView = WKWebView(frame: .zero, configuration: configuration)
        context.coordinator.webView = webView
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.contentInsetAdjustmentBehavior = .never

        if let indexURL = Bundle.main.url(
            forResource: "index",
            withExtension: "html",
            subdirectory: "Web"
        ) {
            webView.loadFileURL(indexURL, allowingReadAccessTo: indexURL.deletingLastPathComponent())
        } else {
            webView.loadHTMLString(
                """
                <html lang="zh-CN">
                  <body style="font-family:-apple-system;padding:24px;">
                    <h1>未找到本地网页资源</h1>
                    <p>请确认 Web 文件夹已加入 Copy Bundle Resources。</p>
                  </body>
                </html>
                """,
                baseURL: nil
            )
        }

        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    static func dismantleUIView(_ uiView: WKWebView, coordinator: Coordinator) {
        uiView.configuration.userContentController.removeScriptMessageHandler(forName: "auditDownload")
    }

    final class Coordinator: NSObject, WKScriptMessageHandler {
        weak var webView: WKWebView?

        func userContentController(
            _ userContentController: WKUserContentController,
            didReceive message: WKScriptMessage
        ) {
            guard message.name == "auditDownload",
                  let payload = message.body as? [String: Any],
                  let contentBase64 = payload["contentBase64"] as? String,
                  let fileData = Data(base64Encoded: contentBase64)
            else {
                return
            }

            let filename = safeFilename(payload["filename"] as? String)
            let temporaryURL = FileManager.default.temporaryDirectory.appendingPathComponent(filename)

            do {
                try fileData.write(to: temporaryURL, options: [.atomic])
                presentShareSheet(for: temporaryURL)
            } catch {
                print("Audit export share failed: \(error.localizedDescription)")
            }
        }

        private func safeFilename(_ value: String?) -> String {
            let fallback = "audit-export.json"
            guard let value, !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
                return fallback
            }
            let allowed = CharacterSet(charactersIn: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.")
            let sanitizedScalars = value.unicodeScalars.map { scalar in
                allowed.contains(scalar) ? Character(scalar) : "-"
            }
            let sanitized = String(sanitizedScalars).trimmingCharacters(in: CharacterSet(charactersIn: ".-"))
            return sanitized.hasSuffix(".json") && !sanitized.isEmpty ? sanitized : fallback
        }

        private func presentShareSheet(for fileURL: URL) {
            DispatchQueue.main.async { [weak self] in
                guard let presentingViewController = self?.topViewController() else {
                    return
                }

                let activityViewController = UIActivityViewController(
                    activityItems: [fileURL],
                    applicationActivities: nil
                )

                if let popover = activityViewController.popoverPresentationController {
                    popover.sourceView = self?.webView
                    popover.sourceRect = self?.webView?.bounds ?? .zero
                }

                presentingViewController.present(activityViewController, animated: true)
            }
        }

        private func topViewController() -> UIViewController? {
            let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
            let rootViewController = scenes
                .flatMap(\.windows)
                .first { $0.isKeyWindow }?
                .rootViewController

            var topViewController = rootViewController
            while let presented = topViewController?.presentedViewController {
                topViewController = presented
            }
            return topViewController
        }
    }
}
