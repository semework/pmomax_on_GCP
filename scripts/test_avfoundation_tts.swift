import Foundation
import AVFoundation

final class Writer {
    let outURL: URL
    let engine = AVAudioEngine()
    let mainMixer = AVAudioMixerNode()
    var file: AVAudioFile?
    var finished = false

    init(outURL: URL) {
        self.outURL = outURL
    }

    func run(text: String, voiceId: String) throws {
        let synth = AVSpeechSynthesizer()
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(identifier: voiceId) ?? AVSpeechSynthesisVoice(language: "en-US")
        utterance.rate = 0.47

        synth.write(utterance) { buffer in
            guard let pcm = buffer as? AVAudioPCMBuffer else { return }
            if pcm.frameLength == 0 {
                self.finished = true
                CFRunLoopStop(CFRunLoopGetMain())
                return
            }
            do {
                if self.file == nil {
                    self.file = try AVAudioFile(
                        forWriting: self.outURL,
                        settings: pcm.format.settings,
                        commonFormat: pcm.format.commonFormat,
                        interleaved: pcm.format.isInterleaved
                    )
                }
                try self.file?.write(from: pcm)
            } catch {
                fputs("write-error: \(error)\n", stderr)
                self.finished = true
                CFRunLoopStop(CFRunLoopGetMain())
            }
        }
        CFRunLoopRun()
    }
}

if CommandLine.arguments.count < 4 {
    fputs("usage: test_avfoundation_tts.swift <out.wav> <voice-id> <text>\n", stderr)
    exit(2)
}

let out = URL(fileURLWithPath: CommandLine.arguments[1])
let voice = CommandLine.arguments[2]
let text = CommandLine.arguments[3]

do {
    let writer = Writer(outURL: out)
    try writer.run(text: text, voiceId: voice)
    print(out.path)
} catch {
    fputs("fatal: \(error)\n", stderr)
    exit(1)
}
