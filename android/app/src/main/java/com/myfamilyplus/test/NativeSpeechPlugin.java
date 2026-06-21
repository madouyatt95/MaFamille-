package com.myfamilyplus.test;

import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.Voice;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@CapacitorPlugin(name = "NativeSpeech")
public class NativeSpeechPlugin extends Plugin {
    private TextToSpeech textToSpeech;
    private boolean ready = false;
    private boolean failed = false;
    private final List<Runnable> pendingActions = new ArrayList<>();

    @Override
    public void load() {
        textToSpeech = new TextToSpeech(
            getContext(),
            status -> {
                ready = status == TextToSpeech.SUCCESS;
                failed = !ready;
                List<Runnable> actions = new ArrayList<>(pendingActions);
                pendingActions.clear();
                for (Runnable action : actions) action.run();
            }
        );
    }

    @PluginMethod
    public void getVoices(PluginCall call) {
        whenReady(call, () -> {
            Set<Voice> available = textToSpeech.getVoices();
            List<Voice> frenchVoices = new ArrayList<>();
            if (available != null) {
                for (Voice voice : available) {
                    if (voice.getLocale().getLanguage().equalsIgnoreCase(Locale.FRENCH.getLanguage())) {
                        frenchVoices.add(voice);
                    }
                }
            }

            frenchVoices.sort(
                Comparator.comparing((Voice voice) -> voice.getLocale().toLanguageTag())
                    .thenComparing(Voice::getName, String.CASE_INSENSITIVE_ORDER)
            );

            JSArray voices = new JSArray();
            for (Voice voice : frenchVoices) {
                Set<String> features = voice.getFeatures();
                boolean installed = features == null || !features.contains("notInstalled");
                JSObject item = new JSObject();
                item.put("id", voice.getName());
                item.put("name", readableVoiceName(voice));
                item.put("language", voice.getLocale().toLanguageTag());
                item.put("quality", voice.getQuality());
                item.put("qualityLabel", qualityLabel(voice.getQuality()));
                item.put("gender", "Non précisé");
                item.put("isInstalled", installed);
                item.put("requiresNetwork", voice.isNetworkConnectionRequired());
                voices.put(item);
            }

            JSObject result = new JSObject();
            result.put("voices", voices);
            call.resolve(result);
        });
    }

    @PluginMethod
    public void speak(PluginCall call) {
        String text = call.getString("text", "");
        if (text.trim().isEmpty()) {
            call.reject("Le texte est requis.");
            return;
        }

        whenReady(call, () -> {
            String voiceId = call.getString("voiceId", "");
            Voice selectedVoice = findVoice(voiceId);
            if (selectedVoice != null) textToSpeech.setVoice(selectedVoice);
            else textToSpeech.setLanguage(Locale.FRANCE);

            double rate = call.getDouble("rate", 0.48);
            double pitch = call.getDouble("pitch", 1.0);
            double volume = call.getDouble("volume", 1.0);
            textToSpeech.setSpeechRate(normalizedAndroidRate(rate));
            textToSpeech.setPitch((float) pitch);

            Bundle params = new Bundle();
            params.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, (float) volume);
            int status = textToSpeech.speak(
                text,
                TextToSpeech.QUEUE_FLUSH,
                params,
                "myfamily-village-" + System.currentTimeMillis()
            );
            if (status == TextToSpeech.ERROR) call.reject("Le moteur vocal Android n'a pas pu démarrer.");
            else call.resolve();
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        if (textToSpeech != null) textToSpeech.stop();
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        if (textToSpeech != null) {
            textToSpeech.stop();
            textToSpeech.shutdown();
            textToSpeech = null;
        }
        super.handleOnDestroy();
    }

    private void whenReady(PluginCall call, Runnable action) {
        if (ready && textToSpeech != null) {
            action.run();
            return;
        }
        if (failed) {
            call.reject("Aucun moteur de synthèse vocale Android n'est disponible.");
            return;
        }
        pendingActions.add(() -> {
            if (ready && textToSpeech != null) action.run();
            else call.reject("Impossible d'initialiser le moteur vocal Android.");
        });
    }

    private Voice findVoice(String voiceId) {
        if (voiceId == null || voiceId.isEmpty() || textToSpeech.getVoices() == null) return null;
        for (Voice voice : textToSpeech.getVoices()) {
            if (voice.getName().equals(voiceId)) return voice;
        }
        return null;
    }

    private String readableVoiceName(Voice voice) {
        String name = voice.getName()
            .replace("fr-fr-", "")
            .replace("fr-ca-", "")
            .replace("fr-be-", "")
            .replace("fr-ch-", "")
            .replace("-local", "")
            .replace("-network", "")
            .replace('-', ' ')
            .trim();
        if (name.isEmpty()) return voice.getName();
        return name.substring(0, 1).toUpperCase(Locale.ROOT) + name.substring(1);
    }

    private String qualityLabel(int quality) {
        if (quality >= Voice.QUALITY_VERY_HIGH) return "Premium";
        if (quality >= Voice.QUALITY_HIGH) return "Améliorée";
        return "Standard";
    }

    private float normalizedAndroidRate(double iosRate) {
        return (float) Math.max(0.1, Math.min(2.0, iosRate / 0.5));
    }
}
