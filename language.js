// language.js - Language names only
const languageNames = {
    en: "English",
    sn: "Shona",
    nd: "Ndebele",
    af: "Afrikaans",
    zu: "Zulu",
    xh: "Xhosa",
    pt: "Portuguese",
    sw: "Swahili",
    hi: "Hindi",
    ar: "Arabic",
    fr: "French",
    es: "Spanish",
    zh: "Chinese",
    de: "German"
};

const languageSections = [
    {
        title: "🌍 Languages",
        rows: [
            { title: "English", description: "EN", rowId: ".setlang en" },
            { title: "Spanish", description: "ES", rowId: ".setlang es" },
            { title: "French", description: "FR", rowId: ".setlang fr" },
            { title: "Chinese", description: "ZH", rowId: ".setlang zh" },
            { title: "Arabic", description: "AR", rowId: ".setlang ar" }
        ]
    }
];

module.exports = { languageNames, languageSections };
