"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const DURGA_PUJA_PANDALS = [
    { name: 'Kumartuli Park', address: 'Kumartuli, Kolkata', latitude: 22.5921, longitude: 88.3544, sequence: 0 },
    { name: 'Bagbazar Sarbojanin', address: 'Bagbazar, Kolkata', latitude: 22.5967, longitude: 88.3641, sequence: 1 },
    { name: 'Sreebhumi Sporting Club', address: 'Sreebhumi, Lake Town, Kolkata', latitude: 22.5971, longitude: 88.3954, sequence: 2 },
    { name: 'Suruchi Sangha', address: 'New Alipore, Kolkata', latitude: 22.5087, longitude: 88.3299, sequence: 3 },
    { name: 'Mohammad Ali Park', address: 'Central Kolkata', latitude: 22.5703, longitude: 88.3629, sequence: 4 },
    { name: 'College Square', address: 'College Square, Kolkata', latitude: 22.5762, longitude: 88.3601, sequence: 5 },
    { name: 'Shyambazar 5 Star Club', address: 'Shyambazar, Kolkata', latitude: 22.5937, longitude: 88.3710, sequence: 6 },
    { name: 'Hatibagan Sarbojanin', address: 'Hatibagan, Kolkata', latitude: 22.5874, longitude: 88.3703, sequence: 7 },
    { name: 'Tala Park Prattoy', address: 'Tala Park, Kolkata', latitude: 22.5942, longitude: 88.3808, sequence: 8 },
    { name: 'Telengabagan Durga Utsav', address: 'Telengabagan, Kolkata', latitude: 22.5789, longitude: 88.3820, sequence: 9 },
    { name: 'Jodhpur Park Sarbojanin', address: 'Jodhpur Park, Kolkata', latitude: 22.5073, longitude: 88.3664, sequence: 10 },
    { name: 'Ekdalia Evergreen', address: 'Ekdalia, Golpark, Kolkata', latitude: 22.5097, longitude: 88.3680, sequence: 11 },
    { name: 'Ballygunge Cultural', address: 'Ballygunge, Kolkata', latitude: 22.5186, longitude: 88.3710, sequence: 12 },
    { name: 'Chetla Agrani Club', address: 'Chetla, Kolkata', latitude: 22.5164, longitude: 88.3417, sequence: 13 },
    { name: 'Tridhara Sammilani', address: 'Bondel Gate, Kolkata', latitude: 22.5161, longitude: 88.3649, sequence: 14 },
    { name: 'Naktala Udayan Sangha', address: 'Naktala, Kolkata', latitude: 22.4870, longitude: 88.3720, sequence: 15 },
    { name: 'Santosh Mitra Square', address: 'Shyambazar, Kolkata', latitude: 22.5856, longitude: 88.3679, sequence: 16 },
    { name: 'Bosepukur Sitala Mandir', address: 'Kasba, Kolkata', latitude: 22.5091, longitude: 88.3897, sequence: 17 },
    { name: 'Mudiali Club', address: 'Mudiali, Kolkata', latitude: 22.5263, longitude: 88.3486, sequence: 18 },
    { name: 'Singhi Park', address: 'Singhi Park, Kolkata', latitude: 22.5107, longitude: 88.3590, sequence: 19 },
    { name: 'Rajdanga Naba Uday Sangha', address: 'Rajdanga, Kolkata', latitude: 22.5009, longitude: 88.3935, sequence: 20 },
];
async function main() {
    console.log('Seeding Durga Puja 2024 demo trip...');
    const trip = await prisma.trip.create({
        data: {
            name: 'Durga Puja 2024 — Kolkata',
            description: 'A curated tour of 21 iconic Durga Puja pandals across Kolkata.',
            travelMode: 'driving',
            routeMode: 'manual',
            isPublic: false,
            stops: {
                create: DURGA_PUJA_PANDALS,
            },
        },
        include: {
            stops: { orderBy: { sequence: 'asc' } },
        },
    });
    console.log(`Created trip: "${trip.name}" with ${trip.stops.length} stops`);
    console.log(`Trip ID: ${trip.id}`);
}
main()
    .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map