const mongoose = require('mongoose');

// Define a sub-schema for rank data (opening and closing)
const RankSchema = new mongoose.Schema({
    openingRank: { type: Number, required: true },
    closingRank: { type: Number, required: true }
}, { _id: false }); // Do not create an _id for sub-documents

// Define a sub-schema for gender-specific data (e.g., genderNeutral, femaleOnly)
const GenderQuotaSchema = new mongoose.Schema({
    '2024': RankSchema, // Dynamic year as key, referencing RankSchema
    '2023': RankSchema,
    '2022': RankSchema,
    // Add more years as needed
}, { _id: false, strict: false }); // strict: false allows dynamic year keys

// Define a sub-schema for category-specific data (e.g., GEN, EWS, OBC-NCL, SC, ST)
const CategoryQuotaSchema = new mongoose.Schema({
    genderNeutral: GenderQuotaSchema,
    femaleOnly: GenderQuotaSchema,
}, { _id: false, strict: false }); // strict: false allows dynamic category keys like 'GEN', 'EWS'

// Define a sub-schema for PwD within categories (optional, if PwD is nested)
const PwDCategoryQuotaSchema = new mongoose.Schema({
    GEN: CategoryQuotaSchema,
    'OBC-NCL': CategoryQuotaSchema,
    SC: CategoryQuotaSchema,
    ST: CategoryQuotaSchema,
    EWS: CategoryQuotaSchema
}, { _id: false, strict: false });

// Define a sub-schema for Quota types (OS, HS)
const QuotaSchema = new mongoose.Schema({
    GEN: CategoryQuotaSchema,
    EWS: CategoryQuotaSchema,
    'OBC-NCL': CategoryQuotaSchema,
    SC: CategoryQuotaSchema,
    ST: CategoryQuotaSchema,
    PwD: PwDCategoryQuotaSchema, // PwD at this level applies across main categories
    // If Home State needs dynamic state keys
}, { _id: false, strict: false }); // strict: false allows dynamic keys like 'OS', 'HS', and state names within 'HS'

// Main College Schema
const CollegeSchema = new mongoose.Schema({
    instituteName: { type: String, required: true },
    instituteType: { type: String, required: true },
    branch: { type: String, required: true },
    quotas: {
        OS: QuotaSchema, // Other State
        HS: mongoose.Schema.Types.Mixed // Home State, use Mixed for dynamic state keys
    }
}, { timestamps: true }); // Add timestamps for creation/update dates

module.exports = mongoose.model('maincollege', CollegeSchema, 'colleges');
// The third argument 'colleges' explicitly sets the collection name to 'colleges'.
// By default, Mongoose would pluralize 'College' to 'colleges', but it's good practice
// to be explicit, especially if your collection name deviates from Mongoose's default.