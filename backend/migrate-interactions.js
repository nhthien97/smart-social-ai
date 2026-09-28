/**
 * Migration script: copy data from old 'userinteractions' collection
 * (Mongoose default) to 'user_interactions' (new explicit name).
 *
 * Run once:  node migrate-interactions.js
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URL = process.env.MONGODB_URL;
const DB_NAME = 'minisocial';

async function main() {
    const client = new MongoClient(MONGODB_URL);
    await client.connect();
    console.log('Connected to MongoDB Atlas');

    const db = client.db(DB_NAME);

    const oldCol = db.collection('userinteractions');
    const newCol = db.collection('user_interactions');

    const oldCount = await oldCol.countDocuments();
    const newCount = await newCol.countDocuments();
    console.log(`Old collection 'userinteractions': ${oldCount} documents`);
    console.log(`New collection 'user_interactions': ${newCount} documents`);

    if (oldCount === 0) {
        console.log('No data to migrate.');
        await client.close();
        return;
    }

    const docs = await oldCol.find({}).toArray();

    // Insert in batches, skip duplicates
    let inserted = 0;
    let skipped = 0;
    for (const doc of docs) {
        try {
            // Remove _id to let MongoDB assign new one, or keep to preserve
            await newCol.updateOne(
                {
                    user_id: doc.user_id,
                    post_id: doc.post_id,
                    interaction_type: doc.interaction_type,
                },
                { $setOnInsert: doc },
                { upsert: true }
            );
            inserted++;
        } catch (e) {
            skipped++;
        }
    }

    console.log(`Migration done: ${inserted} upserted, ${skipped} errors`);

    const finalCount = await newCol.countDocuments();
    console.log(`Final count in 'user_interactions': ${finalCount}`);

    await client.close();
}

main().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
