import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const data = {
      users: [
        {
          id: '08fd4ec3-5cd0-4db4-9ccc-aa85b3a9cd86',
          firstName: 'Abror',
          chatId: '372688724',
          lastName: 'Khamidov',
          username: 'abror_khamidov',
          languageCode: 'en',
          isPremium: false,
          createdAt: '2024-12-29T12:58:15.882Z',
          updatedAt: '2024-12-29T12:58:15.882Z',
        },
        {
          id: '40ee95b9-fe57-49fe-9c0c-ada01cf5af61',
          firstName: 'Ｍｕｈａｍ ｍａｄａｍｉｎ',
          chatId: '526075074',
          lastName: '',
          username: 'muhammad_amin_software_engineer',
          languageCode: 'ru',
          isPremium: false,
          createdAt: '2024-12-29T12:58:15.556Z',
          updatedAt: '2024-12-29T12:58:15.556Z',
        },
        {
          id: '6920f11c-1827-474b-be85-81d3fad2c057',
          firstName: 'ᴍ',
          chatId: '2144613960',
          lastName: '',
          username: 'nuritdinovm',
          languageCode: 'ru',
          isPremium: false,
          createdAt: '2024-12-29T12:58:15.988Z',
          updatedAt: '2024-12-29T12:58:15.988Z',
        },
        {
          id: '7151ee03-9f35-430f-9391-96b16bea6a62',
          firstName: 'Muhammad Sayyid',
          chatId: '2131960681',
          lastName: '',
          username: 'Tursunov_muhammadsayyid',
          languageCode: 'en',
          isPremium: false,
          createdAt: '2024-12-29T13:00:13.352Z',
          updatedAt: '2024-12-29T13:00:13.352Z',
        },
        {
          id: '7cdb2a68-c0c9-45a1-8c7f-4c5d50c8c8ee',
          firstName: ' ',
          chatId: '2',
          lastName: '',
          username: '',
          languageCode: 'en',
          isPremium: false,
          createdAt: '2024-12-29T06:18:16.781Z',
          updatedAt: '2024-12-29T06:18:16.781Z',
        },
        {
          id: '83c5711b-7745-4b0a-b16b-2667bc86a87e',
          firstName: 'Нурислом',
          chatId: '1312640307',
          lastName: 'Хусанов',
          username: 'Nurislom_Husanov',
          languageCode: 'ru',
          isPremium: false,
          createdAt: '2024-12-29T07:14:06.950Z',
          updatedAt: '2024-12-29T07:14:06.950Z',
        },
        {
          id: 'acbada42-feb8-4a46-840f-54d04277ae92',
          firstName: 'Admeral ',
          chatId: '6379136433',
          lastName: '',
          username: 'Admeral_oke',
          languageCode: 'uz',
          isPremium: false,
          createdAt: '2024-12-29T12:58:16.143Z',
          updatedAt: '2024-12-29T12:58:16.143Z',
        },
        {
          id: 'cf58c70f-8ff9-4e58-a325-a5357d90292b',
          firstName: 'Shohjahon',
          chatId: '1254570705',
          lastName: 'Ergashev️ ️🌗',
          username: 'ergashevTech',
          languageCode: 'ru',
          isPremium: false,
          createdAt: '2024-12-29T07:22:54.556Z',
          updatedAt: '2024-12-29T07:22:54.556Z',
        },
        {
          id: 'd3bcda6f-89ca-4e73-92f8-a1bea1df760f',
          firstName: 'Исобек',
          chatId: '1164896420',
          lastName: '',
          username: 'Sant_1zz',
          languageCode: 'uz',
          isPremium: false,
          createdAt: '2024-12-29T07:23:38.920Z',
          updatedAt: '2024-12-29T07:23:38.920Z',
        },
        {
          id: 'ddfb438d-7a1d-4146-a12e-10ec70a6283f',
          firstName: 'Дурбек',
          chatId: '6092896396',
          lastName: '',
          username: 'kydanza',
          languageCode: 'en',
          isPremium: true,
          createdAt: '2024-12-29T06:02:13.553Z',
          updatedAt: '2024-12-29T06:02:13.553Z',
        },
      ],
      total_users: 12,
    };
  await prisma.user.createMany({
    data: data.users,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
