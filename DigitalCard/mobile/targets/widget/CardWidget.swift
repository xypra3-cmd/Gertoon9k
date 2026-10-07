// «Миний QR» widget: the user's business-card QR on the home screen and the lock screen.
// The app writes the card (name, title, link, colour) to the shared App Group as JSON.
import WidgetKit
import SwiftUI
import CoreImage.CIFilterBuiltins

private let appGroup = "group.mn.digitalcard.app"

struct CardInfo: Codable {
    let name: String
    let title: String?
    let url: String
    let color: String?
}

struct CardEntry: TimelineEntry {
    let date: Date
    let card: CardInfo?
}

struct CardProvider: TimelineProvider {
    private func load() -> CardInfo? {
        guard let json = UserDefaults(suiteName: appGroup)?.string(forKey: "card"),
              let data = json.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(CardInfo.self, from: data)
    }

    func placeholder(in context: Context) -> CardEntry {
        CardEntry(date: Date(), card: CardInfo(name: "Digital Card", title: nil, url: "https://digitalcard.mn", color: nil))
    }

    func getSnapshot(in context: Context, completion: @escaping (CardEntry) -> Void) {
        completion(CardEntry(date: Date(), card: load() ?? placeholder(in: context).card))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<CardEntry>) -> Void) {
        // The app calls WidgetCenter.reloadAllTimelines() whenever the card changes.
        completion(Timeline(entries: [CardEntry(date: Date(), card: load())], policy: .never))
    }
}

enum QRCode {
    static func image(for text: String) -> UIImage? {
        let filter = CIFilter.qrCodeGenerator()
        filter.message = Data(text.utf8)
        filter.correctionLevel = "M"
        guard let output = filter.outputImage?.transformed(by: CGAffineTransform(scaleX: 12, y: 12)),
              let cg = CIContext().createCGImage(output, from: output.extent) else { return nil }
        return UIImage(cgImage: cg)
    }
}

extension Color {
    init(hex: String?) {
        var value: UInt64 = 0x2557E6
        if let raw = hex?.trimmingCharacters(in: CharacterSet(charactersIn: "#")), raw.count == 6, let parsed = UInt64(raw, radix: 16) {
            value = parsed
        }
        self.init(
            red: Double((value >> 16) & 0xFF) / 255,
            green: Double((value >> 8) & 0xFF) / 255,
            blue: Double(value & 0xFF) / 255
        )
    }
}

struct QRView: View {
    let url: String
    var body: some View {
        if let image = QRCode.image(for: url) {
            Image(uiImage: image).interpolation(.none).resizable().scaledToFit()
        } else {
            Image(systemName: "qrcode").resizable().scaledToFit()
        }
    }
}

struct CardWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: CardEntry

    var body: some View {
        if let card = entry.card {
            switch family {
            case .accessoryRectangular:
                HStack(spacing: 6) {
                    QRView(url: card.url)
                        .padding(2)
                        .background(Color.white)
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                    VStack(alignment: .leading, spacing: 1) {
                        Text(card.name).font(.headline).lineLimit(1)
                        if let title = card.title, !title.isEmpty {
                            Text(title).font(.caption2).lineLimit(1)
                        }
                    }
                }
            case .systemMedium:
                HStack(spacing: 14) {
                    QRView(url: card.url)
                        .padding(8)
                        .background(Color.white)
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                    VStack(alignment: .leading, spacing: 4) {
                        Text(card.name).font(.title3.bold()).lineLimit(2).minimumScaleFactor(0.7)
                        if let title = card.title, !title.isEmpty {
                            Text(title).font(.subheadline).opacity(0.85).lineLimit(2)
                        }
                        Spacer(minLength: 0)
                        Text("Digital Card").font(.caption2.weight(.semibold)).opacity(0.7)
                    }
                    .foregroundStyle(.white)
                    Spacer(minLength: 0)
                }
            default:
                VStack(spacing: 6) {
                    QRView(url: card.url)
                        .padding(6)
                        .background(Color.white)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    Text(card.name).font(.caption.bold()).foregroundStyle(.white).lineLimit(1).minimumScaleFactor(0.7)
                }
            }
        } else {
            VStack(spacing: 6) {
                Image(systemName: "qrcode").font(.largeTitle)
                Text("Digital Card-аа нээж картаа нийтэлнэ үү").font(.caption).multilineTextAlignment(.center)
            }
            .foregroundStyle(.white)
        }
    }
}

struct CardWidget: Widget {
    let kind = "CardWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: CardProvider()) { entry in
            CardWidgetView(entry: entry)
                .containerBackground(for: .widget) {
                    LinearGradient(
                        colors: [Color(hex: entry.card?.color), Color(hex: entry.card?.color).opacity(0.78)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                }
                .widgetURL(URL(string: "digitalcard://"))
        }
        .configurationDisplayName("Миний QR")
        .description("Нэрийн хуудасны QR — нүүр болон түгжээтэй дэлгэцээс шууд үзүүлнэ.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular])
    }
}
