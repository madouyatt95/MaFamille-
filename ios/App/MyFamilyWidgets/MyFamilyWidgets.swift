import SwiftUI
import WidgetKit

private let microURL = URL(string: "myfamilyplus://action?action=open-micro")!
private let expenseURL = URL(string: "myfamilyplus://action?action=paid")!
private let groceriesURL = URL(string: "myfamilyplus://action?action=add-grocery")!

struct MyFamilyWidgetEntry: TimelineEntry {
    let date: Date
}

struct MyFamilyWidgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> MyFamilyWidgetEntry { MyFamilyWidgetEntry(date: .now) }

    func getSnapshot(in context: Context, completion: @escaping (MyFamilyWidgetEntry) -> Void) {
        completion(MyFamilyWidgetEntry(date: .now))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<MyFamilyWidgetEntry>) -> Void) {
        let entry = MyFamilyWidgetEntry(date: .now)
        completion(Timeline(entries: [entry], policy: .never))
    }
}

struct MyFamilyWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: MyFamilyWidgetEntry

    var body: some View {
        switch family {
        case .accessoryCircular:
            Link(destination: microURL) {
                Image(systemName: "mic.fill")
                    .font(.title2)
            }
        case .accessoryRectangular:
            Link(destination: microURL) {
                HStack(spacing: 8) {
                    Image(systemName: "mic.fill")
                    Text("Parler à MyFamily+")
                }
            }
        case .systemMedium:
            HStack(spacing: 10) {
                actionLink(title: "Micro", icon: "mic.fill", color: .purple, url: microURL)
                actionLink(title: "J’ai payé", icon: "eurosign.circle.fill", color: .green, url: expenseURL)
                actionLink(title: "Courses", icon: "cart.fill", color: .orange, url: groceriesURL)
            }
            .padding(12)
        default:
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Image(systemName: "house.and.flag.fill").foregroundStyle(.purple)
                    Text("MyFamily+").font(.headline)
                }
                Link(destination: microURL) {
                    Label("Ouvrir le micro", systemImage: "mic.fill")
                        .font(.subheadline.weight(.bold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(.purple, in: RoundedRectangle(cornerRadius: 12))
                        .foregroundStyle(.white)
                }
                HStack {
                    Link(destination: expenseURL) { Image(systemName: "eurosign.circle.fill") }
                    Spacer()
                    Link(destination: groceriesURL) { Image(systemName: "cart.fill") }
                }
                .font(.title3)
                .foregroundStyle(.purple)
            }
            .padding(12)
        }
    }

    private func actionLink(title: String, icon: String, color: Color, url: URL) -> some View {
        Link(destination: url) {
            VStack(spacing: 6) {
                Image(systemName: icon).font(.title3)
                Text(title).font(.caption2.weight(.bold)).lineLimit(1)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .foregroundStyle(color)
            .background(color.opacity(0.12), in: RoundedRectangle(cornerRadius: 13))
        }
    }
}

struct MyFamilyQuickWidget: Widget {
    let kind = "fr.myfamilyplus.app.quick-widget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: MyFamilyWidgetProvider()) { entry in
            MyFamilyWidgetView(entry: entry)
        }
        .configurationDisplayName("Actions MyFamily+")
        .description("Micro, dépense et courses depuis l’écran d’accueil.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular])
    }
}

@main
struct MyFamilyWidgets: WidgetBundle {
    var body: some Widget {
        MyFamilyQuickWidget()
    }
}
