import AVFAudio
import Capacitor
import Foundation

@objc(NativeSpeechPlugin)
public class NativeSpeechPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeSpeechPlugin"
    public let jsName = "NativeSpeech"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getVoices", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "speak", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise)
    ]

    private let synthesizer = AVSpeechSynthesizer()

    @objc func getVoices(_ call: CAPPluginCall) {
        var seen = Set<String>()
        let voices = AVSpeechSynthesisVoice.speechVoices()
            .filter { $0.language.lowercased().hasPrefix("fr") }
            .sorted {
                if $0.quality != $1.quality { return $0.quality.rawValue > $1.quality.rawValue }
                return $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending
            }
            .compactMap { voice -> [String: Any]? in
                let key = "\(voice.name.lowercased())|\(voice.language.lowercased())"
                guard seen.insert(key).inserted else { return nil }
                return [
                    "id": voice.identifier,
                    "name": voice.name,
                    "language": voice.language,
                    "quality": voice.quality.rawValue
                ]
            }

        call.resolve(["voices": voices])
    }

    @objc func speak(_ call: CAPPluginCall) {
        guard let text = call.getString("text"), !text.isEmpty else {
            call.reject("Le texte est requis.")
            return
        }

        synthesizer.stopSpeaking(at: .immediate)
        let utterance = AVSpeechUtterance(string: text)
        let identifier = call.getString("voiceId", "")
        utterance.voice = identifier.isEmpty
            ? AVSpeechSynthesisVoice(language: "fr-FR")
            : AVSpeechSynthesisVoice(identifier: identifier)
        utterance.rate = Float(call.getDouble("rate", 0.48))
        utterance.pitchMultiplier = Float(call.getDouble("pitch", 1))
        utterance.volume = Float(call.getDouble("volume", 1))

        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .spokenAudio, options: [.duckOthers])
            try session.setActive(true)
        } catch {
            // Speech can still work with the current audio session.
        }

        synthesizer.speak(utterance)
        call.resolve()
    }

    @objc func stop(_ call: CAPPluginCall) {
        synthesizer.stopSpeaking(at: .immediate)
        call.resolve()
    }
}
