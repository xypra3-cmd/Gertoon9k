// Keep identical to modules/event-activity/ios/EventAttributes.swift — ActivityKit matches the type by name.
import ActivityKit
import Foundation

@available(iOS 16.1, *)
struct EventAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var contacts: Int
        var until: Date
        var metLabel: String
    }

    var name: String
}
