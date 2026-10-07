// Event mode Live Activity: event name, people met and a countdown on the lock screen and in the
// Dynamic Island. Started/updated from the app through modules/event-activity.
import ActivityKit
import WidgetKit
import SwiftUI

private let eventPurple = Color(red: 0.486, green: 0.227, blue: 0.929) // palette.accent[600]

@available(iOS 16.2, *)
struct EventLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: EventAttributes.self) { context in
            let now = Date()
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(context.attributes.name).font(.headline).lineLimit(1)
                    Label("\(context.state.contacts) \(context.state.metLabel)", systemImage: "person.2.fill")
                        .font(.subheadline)
                        .opacity(0.9)
                }
                Spacer(minLength: 8)
                Text(timerInterval: now...max(now, context.state.until), countsDown: true)
                    .font(.title3.monospacedDigit().bold())
                    .multilineTextAlignment(.trailing)
                    .frame(maxWidth: 96)
            }
            .padding(16)
            .foregroundStyle(.white)
            .activityBackgroundTint(eventPurple)
            .activitySystemActionForegroundColor(.white)
            .widgetURL(URL(string: "digitalcard://"))
        } dynamicIsland: { context in
            let now = Date()
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Label("\(context.state.contacts)", systemImage: "person.2.fill").font(.title3.bold())
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(timerInterval: now...max(now, context.state.until), countsDown: true)
                        .monospacedDigit()
                        .frame(maxWidth: 72)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(context.attributes.name).font(.headline).lineLimit(1)
                }
            } compactLeading: {
                Image(systemName: "person.2.fill").foregroundStyle(eventPurple)
            } compactTrailing: {
                Text("\(context.state.contacts)").monospacedDigit()
            } minimal: {
                Text("\(context.state.contacts)").monospacedDigit()
            }
            .widgetURL(URL(string: "digitalcard://"))
        }
    }
}
