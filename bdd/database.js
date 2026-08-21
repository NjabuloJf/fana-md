// bdd/database.js
const { Sequelize } = require('sequelize');
const path = require('path');

// Try PostgreSQL first, fallback to SQLite
let sequelize;
try {
    const s = require('../set');
    const dbUrl = s.DATABASE_URL || process.env.DATABASE_URL;
    
    if (dbUrl && dbUrl.includes('postgres')) {
        sequelize = new Sequelize(dbUrl, {
            dialect: 'postgres',
            protocol: 'postgres',
            dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
            logging: false,
            pool: { max: 3, idle: 10000, acquire: 3000 }
        });
        console.log('📊 Using PostgreSQL');
    }
} catch (e) {
    console.log('⚠️ PostgreSQL failed, using SQLite');
}

if (!sequelize) {
    sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: path.join(__dirname, '../database.sqlite'),
        logging: false
    });
    console.log('📊 Using SQLite');
}

async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected!');
        return true;
    } catch (error) {
        console.log('⚠️ Database connection failed:', error.message);
        return false;
    }
}

async function query(sql, replacements) {
    try {
        return await sequelize.query(sql, { replacements, type: sequelize.QueryTypes.SELECT });
    } catch (error) {
        console.log('⚠️ Query error:', error.message);
        return [];
    }
}

module.exports = { sequelize, testConnection, query };
