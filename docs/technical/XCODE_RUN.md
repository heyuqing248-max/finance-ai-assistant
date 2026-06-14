# Xcode Run Guide / Xcode 运行说明

## Current Status / 当前状态
As of 2026-06-02, the project direction has changed to webpage/PWA production. This Xcode guide is kept only as historical packaging reference and is not a current development or QA acceptance gate unless native packaging is explicitly revived.

截至 2026-06-02，项目方向已改为网页 / PWA 制作。本文档仅作为历史封装参考保留；除非明确恢复原生封装，否则不再作为当前开发或测试验收标准。

## Project Path / 工程路径

Open this file in Xcode:

```text
/Users/serena/Desktop/project/finance-ai-assistant/ios/FinanceAIAssistant.xcodeproj
```

用 Xcode 打开这个文件：

```text
/Users/serena/Desktop/project/finance-ai-assistant/ios/FinanceAIAssistant.xcodeproj
```

## How to Run / 如何运行

1. Install full Xcode from the Mac App Store if it is not installed.
2. Open `FinanceAIAssistant.xcodeproj`.
3. Select the `FinanceAIAssistant` scheme.
4. Choose an iPhone simulator, such as iPhone 16 or another available simulator.
5. Click Run.

中文步骤：

1. 如果电脑没有完整 Xcode，请先从 Mac App Store 安装 Xcode。
2. 打开 `FinanceAIAssistant.xcodeproj`。
3. 选择 `FinanceAIAssistant` scheme。
4. 选择一个 iPhone 模拟器，例如 iPhone 16 或其他可用模拟器。
5. 点击 Run 运行。

## Current Implementation / 当前实现方式

The iOS app uses SwiftUI + WKWebView to load bundled local Web/PWA files from:

```text
ios/FinanceAIAssistant/Web/
```

当前 iOS App 使用 SwiftUI + WKWebView 加载本地网页资源：

```text
ios/FinanceAIAssistant/Web/
```

This means the first Xcode version can run without network access or dependency downloads.

这意味着第一版 Xcode 工程不需要联网下载依赖，也不需要后端服务即可运行。

## Verification Note / 验证说明

The project was verified with Xcode 26.5. `xcodebuild -list` recognized the `FinanceAIAssistant` target and scheme, and a Debug simulator build completed successfully.

当前项目已使用 Xcode 26.5 验证。`xcodebuild -list` 可以识别 `FinanceAIAssistant` target 和 scheme，并且 Debug 模拟器编译已成功完成。

Verified command:

```bash
xcodebuild -project /Users/serena/Desktop/project/finance-ai-assistant/ios/FinanceAIAssistant.xcodeproj -scheme FinanceAIAssistant -configuration Debug -destination "generic/platform=iOS Simulator" -derivedDataPath /private/tmp/FinanceAIAssistantDerivedData build
```
