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

    public override func load() {
        if #available(iOS 17.0, *) {
            NotificationCenter.default.addObserver(
                self,
                selector: #selector(availableVoicesDidChange),
                name: AVSpeechSynthesizer.availableVoicesDidChangeNotification,
                object: nil
            )
        }
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    @objc func getVoices(_ call: CAPPluginCall) {
        call.resolve(["voices": serializedFrenchVoices()])
    }

    @objc private func availableVoicesDidChange() {
        notifyListeners("voicesChanged", data: ["voices": serializedFrenchVoices()])
    }

    private func serializedFrenchVoices() -> [[String: Any]] {
        AVSpeechSynthesisVoice.speechVoices()
            .filter { $0.language.lowercased().hasPrefix("fr") }
            .sorted {
                if $0.language != $1.language {
                    return $0.language.localizedCaseInsensitiveCompare($1.language) == .orderedAscending
                }
                if $0.name != $1.name {
                    return $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending
                }
                if $0.quality != $1.quality {
                    return $0.quality.rawValue > $1.quality.rawValue
                }
                return $0.identifier.localizedCaseInsensitiveCompare($1.identifier) == .orderedAscending
            }
            .map { voice -> [String: Any] in
                var result: [String: Any] = [
                    "id": voice.identifier,
                    "name": voice.name,
                    "language": voice.language,
                    "quality": voice.quality.rawValue,
                    "qualityLabel": qualityLabel(for: voice.quality),
                    "gender": genderLabel(for: voice.gender)
                ]

                if #available(iOS 17.0, *) {
                    result["isNovelty"] = voice.voiceTraits.contains(.isNoveltyVoice)
                    result["isPersonal"] = voice.voiceTraits.contains(.isPersonalVoice)
                }
                return result
            }
    }

    private func qualityLabel(for quality: AVSpeechSynthesisVoiceQuality) -> String {
        if #available(iOS 16.0, *), quality == .premium {
            return "Premium"
        }
        switch quality {
        case .enhanced:
            return "Améliorée"
        default:
            return "Standard"
        }
    }

    private func genderLabel(for gender: AVSpeechSynthesisVoiceGender) -> String {
        switch gender {
        case .female:
            return "Féminine"
        case .male:
            return "Masculine"
        default:
            return "Non précisé"
        }
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
