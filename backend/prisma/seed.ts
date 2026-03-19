import prisma from '../src/prisma';

const communities = [
  {
    name: 'KwaNgwenya',
    region: 'Jozini, KwaZulu-Natal',
    description: 'Rural community near Pongolapoort Dam focused on agriculture and crafts.',
    latitude: -27.4215,
    longitude: 32.0585
  },
  {
    name: 'Mhlekazi',
    region: 'Ulundi, KwaZulu-Natal',
    description: 'Township hub with mobile food stalls and service hustles.',
    latitude: -28.335,
    longitude: 31.416
  },
  {
    name: 'Mkuze',
    region: 'uMkhanyakude District',
    description: 'Small-town economy with transport and fresh produce businesses.',
    latitude: -27.6167,
    longitude: 32.0333
  }
];

async function main() {
  console.log('Seeding Hustle Economy reference data...');
  for (const community of communities) {
    await prisma.community.upsert({
      where: { name: community.name },
      update: community,
      create: community
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('Seed complete');
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
