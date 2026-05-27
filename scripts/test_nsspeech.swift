import Foundation
import AppKit

final class SpeechDelegate: NSObject, NSSpeechSynthesizerDelegate {
    var done = false
    func speechSynthesizer(_ sender: NSSpeechSynthesizer, didFinishSpeaking finishedSpeaking: Bool) {
        done = true
        CFRunLoopStop(CFRunLoopGetMain())
    }
}

if CommandLine.arguments.count < 4 {
    fputs("usage: test_nsspeech.swift <out.aiff> <voice-name> <text>\n", stderr)
    exit(2)
}

let out = URL(fileURLWithPath: CommandLine.arguments[1])
let voiceName = CommandLine.arguments[2]
let text = CommandLine.arguments[3]

let synthesizer = NSSpeechSynthesizer(voice: nil)
let delegate = SpeechDelegate()
synthesizer?.delegate = delegate

let voices = NSSpeechSynthesizer.availableVoices
if let matched = voices.first(where: { $0.contains(voiceName) }) {
    synthesizer?.setVoice(matched)
}

if synthesizer?.startSpeaking(text, to: out) != true {
    fputs("failed to start speaking\n", stderr)
    exit(1)
}

CFRunLoopRun()
print(out.path)
