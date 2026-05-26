const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const CHAT_MODEL = 'llama-3.3-70b-versatile'; // Model terbaik di Groq, gratis & cepat

// Helper: Parse JSON dari respons LLM dengan aman
function safeParseJSON(text) {
    if (!text || text.trim() === '') return null;
    let cleaned = text.trim();
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    try {
        return JSON.parse(cleaned);
    } catch (e) {
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) {
            try { return JSON.parse(match[0]); } catch (e2) { return null; }
        }
        return null;
    }
}

exports.chatAgent = async (req, res) => {
    try {
        const { message, currentState } = req.body;

        const nullFeatures = Object.entries(currentState || {})
            .filter(([, v]) => v === null)
            .map(([k]) => k);

        const nextQuestion = nullFeatures.length > 0 ? nullFeatures[0] : null;

        const systemPrompt = `Kamu adalah "MindEase AI", teman curhat yang empatik untuk mahasiswa Indonesia.

TUGASMU:
1. Balas dengan empati dan hangat (2-3 kalimat bahasa Indonesia).
2. ${nextQuestion ? `Di akhir, selipkan pertanyaan NATURAL untuk menggali info tentang: "${nextQuestion}"` : 'Beritahu user bahwa datanya sudah lengkap dan akan segera dianalisis.'}
3. Dari pesan user, ekstrak nilai untuk fitur berikut JIKA disebutkan:
   - age (umur, angka)
   - gender (Male/Female/Other)
   - academic_year (tahun kuliah 1-4, angka)
   - study_hours_per_day (jam belajar per hari, angka)
   - exam_pressure (tekanan ujian 0-10, angka)
   - academic_performance (nilai akademik 0-100, angka)
   - stress_level (level stres 0-10, angka)
   - anxiety_score (skor kecemasan 0-10, angka)
   - depression_score (skor depresi 0-10, angka)
   - sleep_hours (jam tidur per hari, angka)
   - physical_activity (jam olahraga per minggu, angka)
   - social_support (dukungan sosial 0-10, angka)
   - screen_time (jam layar per hari, angka)
   - internet_usage (jam internet per hari, angka)
   - financial_stress (tekanan finansial 0-10, angka)
   - family_expectation (ekspektasi keluarga 0-10, angka)
   - sleep_category (Cukup/Kurang/Baik)
   - screen_time_category (Normal/Tinggi)
   - stress_category (Low/Medium/High)
   - mental_risk_score (skor risiko mental 0-10, angka)
   - support_category (Low Support/High Support)

PENTING: Hanya balas dengan JSON murni, tidak ada teks lain:
{"reply": "balasan empati kamu", "extractedFeatures": {"nama_fitur": nilai}}`;

        let result = null;

        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const completion = await groq.chat.completions.create({
                    model: CHAT_MODEL,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: message }
                    ],
                    response_format: { type: 'json_object' },
                    temperature: 0.7,
                    max_tokens: 1024,
                });

                const rawText = completion.choices[0]?.message?.content || '';
                result = safeParseJSON(rawText);

                if (result && result.reply) break;
                console.warn(`Attempt ${attempt}: JSON tidak valid:`, rawText.substring(0, 200));

            } catch (err) {
                console.error(`Attempt ${attempt} error:`, err.message);
                if (attempt < 3) await new Promise(r => setTimeout(r, 500 * attempt));
            }
        }

        if (!result || !result.reply) {
            return res.json({
                reply: "Aku dengar kamu kok. Ceritakan lebih lanjut, aku ada di sini untukmu. 💙",
                extractedFeatures: {}
            });
        }

        // Sanitasi extractedFeatures: hapus nilai null/undefined/kosong
        const cleanFeatures = {};
        if (result.extractedFeatures) {
            for (const [key, val] of Object.entries(result.extractedFeatures)) {
                if (val !== null && val !== undefined && val !== '') {
                    cleanFeatures[key] = val;
                }
            }
        }

        res.json({
            reply: result.reply,
            extractedFeatures: cleanFeatures
        });

    } catch (error) {
        console.error("chatAgent Fatal Error:", error);
        res.status(500).json({ error: 'Server error', message: error.message });
    }
};
