// Starts / updates / ends the Event mode Live Activity (lock screen + Dynamic Island).
// The UI lives in the widget extension: targets/widget/EventLiveActivity.swift.
import ActivityKit
import ExpoModulesCore

public class EventActivityModule: Module {
    public func definition() -> ModuleDefinition {
        Name("EventActivity")

        Function("isSupported") { () -> Bool in
            if #available(iOS 16.2, *) {
                return ActivityAuthorizationInfo().areActivitiesEnabled
            }
            return false
        }

        AsyncFunction("start") { (name: String, untilMs: Double, contacts: Int, metLabel: String) throws -> String? in
            guard #available(iOS 16.2, *) else { return nil }
            let until = Date(timeIntervalSince1970: untilMs / 1000)
            let state = EventAttributes.ContentState(contacts: contacts, until: until, metLabel: metLabel)
            let activity = try Activity<EventAttributes>.request(
                attributes: EventAttributes(name: name),
                content: ActivityContent(state: state, staleDate: until)
            )
            return activity.id
        }

        AsyncFunction("update") { (id: String, untilMs: Double, contacts: Int, metLabel: String) async -> Bool in
            guard #available(iOS 16.2, *) else { return false }
            let until = Date(timeIntervalSince1970: untilMs / 1000)
            let state = EventAttributes.ContentState(contacts: contacts, until: until, metLabel: metLabel)
            var found = false
            for activity in Activity<EventAttributes>.activities where activity.id == id {
                found = true
                await activity.update(ActivityContent(state: state, staleDate: until))
            }
            return found
        }

        AsyncFunction("end") { (id: String?) async in
            guard #available(iOS 16.2, *) else { return }
            for activity in Activity<EventAttributes>.activities where id == nil || activity.id == id {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
        }
    }
}
