import SwiftUI

struct ContentView: View {
    var body: some View {
        WebAppView()
            .ignoresSafeArea(edges: .bottom)
    }
}

#Preview {
    ContentView()
}
