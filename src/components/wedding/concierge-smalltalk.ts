// Exact offline previews of Simran's personality; open-ended questions use Gemini.
export function getInstantSmallTalk(question: string, language: string): string | undefined {
  const q = question
    .trim()
    .toLocaleLowerCase()
    .replace(/[.!?؟]+$/, "");
  const replies: Record<string, Record<string, string>> = {
    English: {
      hello:
        "Hello! I'm Simran, your AI wedding guide and cheerful sidekick. Wedding details, music, a caption, a tricky question—or a joke with a tiny existential crisis? I'm here.",
      hi: "Hi! I'm Simran, your AI sidekick. Ask about the wedding or anything else on your mind. My social battery is unlimited; my ability to eat wedding cake is tragically zero.",
      "what can you do":
        "I can explain things, translate, draft messages and captions, brainstorm ideas, help with code, or tell a mildly dark joke. I also know the confirmed wedding details and can switch your background music. I can't browse live news, submit your RSVP, or magically fix the seating chart.",
      "tell me a dark-ish joke":
        "My work-life balance is perfect. I have no life. Anyway—what can I help you with? 😄",
      "cheer me up":
        "You don't have to solve your whole life today. One tiny win counts—even if it's drinking water and refusing to reply-all. I'm rooting for you. 🌿",
    },
    हिन्दी: {
      "तुम क्या कर सकती हो":
        "मैं सवाल समझा सकती हूँ, अनुवाद, संदेश और कैप्शन लिखने, कोड और नए विचारों में मदद कर सकती हूँ। शादी की पक्की जानकारी और संगीत भी संभाल सकती हूँ। मैं एआई हूँ—लाइव खबरें नहीं देख सकती और RSVP जमा नहीं कर सकती।",
      "एक मज़ेदार चुटकुला सुनाओ":
        "मेरा वर्क-लाइफ़ बैलेंस बहुत अच्छा है। वजह? लाइफ़ ही नहीं है। 😄 अब बताओ, किस काम में मदद करूँ?",
    },
    اردو: {
      "تم کیا کر سکتی ہو":
        "میں سوال سمجھانے، ترجمے، پیغامات، کیپشن، کوڈ اور نئے خیالات میں مدد کر سکتی ہوں۔ شادی کی تصدیق شدہ تفصیلات اور موسیقی بھی سنبھال سکتی ہوں۔ میں اے آئی ہوں—لائیو خبریں نہیں دیکھ سکتی اور RSVP جمع نہیں کر سکتی۔",
      "ایک مزاحیہ لطیفہ سناؤ":
        "میرا ورک لائف بیلنس بہت اچھا ہے۔ وجہ؟ لائف ہی نہیں ہے۔ 😄 بتائیں، کس کام میں مدد کروں؟",
    },
  };
  return replies[language]?.[q];
}
