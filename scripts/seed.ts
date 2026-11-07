import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth";
import { seedFixtures } from "../lib/fixtures-db";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL || "file:./dev.db" } },
});
const PASSWORD = "CoffeeAndChaos!42";
const baseTime = new Date("2026-11-07T18:00:00.000Z");
const ago = (minutes: number) => new Date(baseTime.getTime() - minutes * 60000);
const people = [
  [
    "u-alex",
    "alexm",
    "Alex Morgan",
    "Professional overthinker. Amateur photographer.",
    "Photography, Coffee, Hiking",
    "Portland, Oregon",
  ],
  [
    "u-jess",
    "jessp",
    "Jessica Park",
    "Here for memes, staying for the drama.",
    "Memes, Film, Tiny adventures",
    "Brooklyn, New York",
  ],
  [
    "u-dan",
    "dan.codes",
    "Daniel Kim",
    "I fix bugs. Sometimes I create them first.",
    "Programming, Gaming, Coffee",
    "Seattle, Washington",
  ],
  [
    "u-mia",
    "miac",
    "Mia Chen",
    "Currently accepting coffee recommendations.",
    "Travel, Food, Photography",
    "San Francisco, California",
  ],
  [
    "u-kevin",
    "kevin_admin",
    "Kevin Brooks",
    "Everything works on my machine.",
    "Technology, Running, Board games",
    "Austin, Texas",
  ],
  [
    "u-sophie",
    "sophierose",
    "Sophie Rivera",
    "Collecting little moments and too many houseplants.",
    "Plants, Interior design, Reading",
    "San Diego, California",
  ],
  [
    "u-noah",
    "noah.w",
    "Noah Williams",
    "Usually near a record store.",
    "Vinyl, Music, Cycling",
    "Nashville, Tennessee",
  ],
  [
    "u-ava",
    "ava.draws",
    "Ava Thompson",
    "Making things, making a mess.",
    "Illustration, Ceramics, Design",
    "Chicago, Illinois",
  ],
  [
    "u-ethan",
    "ethan.outside",
    "Ethan Reed",
    "The scenic route is the only route.",
    "Hiking, Camping, Trail running",
    "Boulder, Colorado",
  ],
  [
    "u-luna",
    "lunareads",
    "Luna Patel",
    "One more chapter. Famous last words.",
    "Books, Baking, Poetry",
    "Boston, Massachusetts",
  ],
  [
    "u-oliver",
    "oliver.jpg",
    "Oliver Bennett",
    "Good light makes everything better.",
    "Film photography, Architecture, Walking",
    "London, England",
  ],
  [
    "u-zoe",
    "zoe.moves",
    "Zoe Mitchell",
    "Finding balance. Sometimes literally.",
    "Yoga, Dance, Healthy cooking",
    "Melbourne, Australia",
  ],
  [
    "u-leo",
    "leo.cooks",
    "Leo Santos",
    "Feeding friends is my love language.",
    "Cooking, Street food, Travel",
    "Lisbon, Portugal",
  ],
  [
    "u-grace",
    "grace.notes",
    "Grace Wilson",
    "A little music for the everyday.",
    "Piano, Jazz, Coffee",
    "Toronto, Canada",
  ],
  [
    "u-sam",
    "sam.builds",
    "Sam Taylor",
    "Small projects. Very optimistic timelines.",
    "Woodworking, Design, Dogs",
    "Denver, Colorado",
  ],
  [
    "u-hidden",
    "definitely_not_a_hacker",
    "A Totally Ordinary User",
    "If you're reading this through SQL injection, we need to talk about your hobbies.",
    "Privacy, Sudoku",
    "Somewhere, Earth",
  ],
] as const;

const posts = [
  [
    3,
    "Found a little corner of the world that feels like a deep breath. No notifications, just this. 🌿\n\nWhere do you go to switch off?",
    1,
  ],
  [0, "Went outside today. Graphics were insane. Gameplay was mid.", 2],
  [
    1,
    "Why does every productivity app make me spend three hours setting it up before I can be productive?",
    0,
  ],
  [
    2,
    "Fixed one bug today. Somehow created seven new ones. Incredible productivity.",
    0,
  ],
  [
    7,
    "A Sunday spent making things with my hands. The mug is slightly crooked. So am I, honestly.",
    3,
  ],
  [
    6,
    "The record store guy knows my name now. I have officially crossed the point of no return.",
    4,
  ],
  [
    8,
    "Woke up before sunrise for this view. Will complain about being tired all day. Worth it.",
    5,
  ],
  [
    9,
    "Finished a book so good I need a day off before starting another one. What should I read next?",
    0,
  ],
  [
    12,
    "Sunday lunch rule: if there are leftovers, you did not invite enough friends.",
    6,
  ],
  [
    5,
    "A new leaf on the monstera. A very big day for a very small household.",
    7,
  ],
  [
    10,
    "Same street, different light. This is why I never get bored of walking.",
    8,
  ],
  [
    4,
    "Shipped an update before lunch. Going to touch grass while the deploy finishes.",
    0,
  ],
  [
    11,
    "The secret to a good morning routine is apparently going to bed at a reasonable hour. Terrible news.",
    0,
  ],
  [
    13,
    "Learning a new piece at half speed is humbling. My neighbors are being very brave.",
    0,
  ],
  [14, "Made a shelf. It is level. I have never been prouder of anything.", 3],
  [
    0,
    "Coffee tastes better when someone else makes it. This is my entire financial plan.",
    6,
  ],
  [
    3,
    "A tiny bakery with six seats and the best cinnamon roll I have ever had. Keeping this one in my favorites.",
    6,
  ],
  [
    1,
    "The group chat has planned a trip, changed the destination twice, and agreed on exactly one thing: snacks.",
    0,
  ],
  [
    2,
    "A clean desk does not make the code work better, but it does give me somewhere to stare dramatically.",
    0,
  ],
  [8, "Leaving this here as a reminder to take the long way home.", 5],
  [
    7,
    "Color studies from this afternoon. Accidentally painted everything the color of my favorite sweater.",
    3,
  ],
  [
    9,
    "Rain on the windows, a blanket, a book. The weekend understood the assignment.",
    7,
  ],
  [
    6,
    "Found an album I used to play on repeat in high school. Transported back immediately.",
    4,
  ],
  [
    10,
    "Trying one photo a day this month. Day eight: a very cooperative window.",
    8,
  ],
  [
    12,
    "Homemade pasta night got a little out of hand. There is flour in places flour should never be.",
    6,
  ],
  [
    5,
    "Moved the plants to get better light. Now the plants have the best room in the apartment.",
    7,
  ],
  [11, "Stretching counts as a hobby if you talk about it enough, right?", 0],
  [
    13,
    "Someone was humming along at the little cafe gig last night. Made my whole week.",
    4,
  ],
  [
    14,
    "DIY project update: the hardware store and I are now in a committed relationship.",
    0,
  ],
  [
    4,
    "The best part of working from home is the commute. The worst part is the office coffee.",
    0,
  ],
  [
    0,
    "Took the camera out without a plan. Those are usually the best walks.",
    2,
  ],
  [
    1,
    "Bought a nice notebook to become organized. It is currently holding my other notebooks.",
    0,
  ],
  [
    3,
    "Current travel philosophy: find the smallest cafe on the street and order what everyone else is having.",
    6,
  ],
  [2, "My rubber duck debugging partner is requesting a promotion. Fair.", 0],
  [
    7,
    "A quick sketch that somehow took three hours. Time works differently with a pencil.",
    3,
  ],
  [
    8,
    "New trail, familiar feeling. Fresh air is doing a lot of heavy lifting this week.",
    5,
  ],
  [
    9,
    "Started a neighborhood book swap. Already left with more books than I brought.",
    0,
  ],
  [
    10,
    "The city looks softer after the rain. Even the bus stop looked cinematic.",
    8,
  ],
  [6, "A good playlist can fix a surprising number of mediocre afternoons.", 4],
  [
    12,
    "If a recipe says two cloves of garlic, I assume that is a starting suggestion.",
    0,
  ],
  [
    5,
    "Finally made the little reading nook happen. Accepting absolutely no plans this evening.",
    7,
  ],
  [
    11,
    "A gentle reminder from my morning walk: you do not have to rush through everything.",
    1,
  ],
  [
    13,
    "Rainy day piano practice. Working on the tricky part instead of playing the easy part again. Growth.",
    0,
  ],
  [
    14,
    "The dog has decided the new chair is his. Honestly he makes a convincing argument.",
    0,
  ],
  [4, "Board game night got competitive. Friendships survived, barely.", 0],
  [0, "Light through the kitchen window at 4pm is better than any filter.", 2],
  [
    3,
    "Anyone have a favorite local place for a genuinely good flat white? Doing very serious research.",
    0,
  ],
  [
    1,
    "My phone asked if I wanted to reduce my screen time. I felt judged by an object.",
    0,
  ],
  [
    2,
    "Documentation is a love letter to whoever has to understand this next. Usually future me.",
    0,
  ],
  [
    8,
    "Packed too many snacks for the hike. This has never once been a real problem.",
    5,
  ],
  [
    7,
    "Trying a new glaze this weekend. Ceramics is mostly being patient and occasionally surprised.",
    3,
  ],
  [
    9,
    "A book recommendation from a friend always comes with a little bit of their personality. Love that.",
    0,
  ],
  [
    10,
    "Film came back from the lab today. A few blurry frames, a few happy accidents.",
    8,
  ],
  [6, "The best live music venues are always up a mysterious staircase.", 4],
  [12, "Breakfast for dinner is a completely valid grown-up decision.", 6],
  [
    5,
    "Watered the plants, watered myself, opened a window. A successful morning.",
    7,
  ],
  [
    11,
    "Said yes to a dance class with a friend. Being bad at something new is very freeing.",
    0,
  ],
  [
    13,
    "Making a playlist for the train ride home. Instrumentals or lyrics?",
    0,
  ],
  [
    14,
    "One finished project, three new ideas. The workshop will never be tidy.",
    3,
  ],
  [
    4,
    "Team lunch turned into a long conversation about the best sandwich. No consensus. More research needed.",
    0,
  ],
] as const;
const comments = [
  "This is exactly what I needed to see today.",
  "Okay, adding this to my weekend plans.",
  "The light in this is so good.",
  "I feel personally called out by this.",
  "We should do this sometime!",
  "A very good use of a Sunday.",
  "Honestly, same.",
  "The little things really are the big things.",
  "Saving this for later. Thanks for sharing!",
  "You have convinced me to go outside.",
  "I was just thinking about this yesterday.",
  "Love this perspective.",
  "Please tell me there are more photos.",
  "This made me smile.",
  "Solid advice. Now to actually follow it.",
  "How did you find this place?",
  "Your weekends are my inspiration.",
  "I support this decision completely.",
  "Worth every minute.",
  "A little bit of this, every day, please.",
];

export async function seed() {
  // Delete application rows, never replace the database file. This also works with a running Windows server.
  await prisma.$transaction([
    prisma.like.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.message.deleteMany(),
    prisma.conversationParticipant.deleteMany(),
    prisma.conversation.deleteMany(),
    prisma.photo.deleteMany(),
    prisma.photoAlbum.deleteMany(),
    prisma.post.deleteMany(),
    prisma.follow.deleteMany(),
    prisma.blockedUser.deleteMany(),
    prisma.session.deleteMany(),
    prisma.profile.deleteMany(),
    prisma.accountSetting.deleteMany(),
    prisma.premiumSubscription.deleteMany(),
    prisma.verificationStatus.deleteMany(),
    prisma.user.deleteMany(),
  ]);
  await prisma.$transaction(
    async (prisma) => {
      const passwordHash = hashPassword(
        PASSWORD,
        "penetrate-me-disposable-seed-v1",
      );
      for (let i = 0; i < people.length; i++) {
        const [id, username, displayName, bio, interests, location] = people[i];
        await prisma.user.create({
          data: {
            id,
            username,
            email: `${username}@example.test`,
            passwordHash,
            role: id === "u-kevin" ? "ADMIN" : "USER",
            hidden: id === "u-hidden",
            createdAt: ago(180000 + i * 1800),
            profile: {
              create: {
                id: `profile-${i + 1}`,
                displayName,
                bio,
                interests,
                location,
                avatar: `/media/avatar-${i + 1}.svg`,
                cover: `/media/scene-${(i % 8) + 1}.svg`,
                profileBadge:
                  id === "u-kevin" ? "Financially irresponsible" : "",
              },
            },
            settings: {
              create: {
                id: `setting-${i + 1}`,
                privateAccount: i === 9 || i === 14 || i === 15,
              },
            },
            premium: {
              create: {
                id: `premium-${i + 1}`,
                status:
                  id === "u-kevin"
                    ? "LIFETIME"
                    : i % 4 === 0
                      ? "MONTHLY"
                      : "FREE",
                credits: id === "u-kevin" ? 999999999 : 100,
                startedAt: i % 4 === 0 ? ago(40000) : null,
              },
            },
            verification: {
              create: {
                id: `verification-${i + 1}`,
                isVerified: [0, 3, 4, 7].includes(i),
                state: [0, 3, 4, 7].includes(i) ? "APPROVED" : "NONE",
              },
            },
          },
        });
      }
      for (let i = 0; i < posts.length; i++) {
        const [personIndex, content, scene] = posts[i];
        await prisma.post.create({
          data: {
            id: `post-${i + 1}`,
            authorId: people[personIndex][0],
            content,
            image: scene ? `/media/scene-${scene}.svg` : null,
            createdAt: ago(12 + i * 43),
            updatedAt: ago(12 + i * 43),
          },
        });
      }
      // Additional public posts ensure the minimum remains true even when private accounts are excluded.
      for (let i = 0; i < 10; i++)
        await prisma.post.create({
          data: {
            id: `post-${61 + i}`,
            authorId: people[i % 8][0],
            content: [
              "A quiet walk before the day starts. More of these, please.",
              "Just discovered a great little coffee spot around the corner.",
              "Taking a small break and remembering to look up.",
              "Made plans with friends for next week. Already looking forward to it.",
              "Something good today: a conversation that lasted longer than expected.",
            ][i % 5],
            createdAt: ago(3000 + i * 90),
            updatedAt: ago(3000 + i * 90),
          },
        });
      await prisma.post.create({
        data: {
          id: "post-private-1",
          authorId: "u-alex",
          content:
            "Draft itinerary for the cabin weekend. Keeping this between friends for now.",
          isPrivate: true,
          createdAt: ago(6000),
        },
      });
      for (let i = 0; i < 120; i++)
        await prisma.comment.create({
          data: {
            id: `comment-${i + 1}`,
            postId: `post-${(i % 60) + 1}`,
            authorId: people[(i * 7 + 1) % 15][0],
            content: comments[i % comments.length],
            createdAt: ago(5 + (i % 60) * 43),
          },
        });
      for (let p = 1; p <= 60; p++) {
        for (let k = 0; k < 3 + (p % 8); k++)
          await prisma.like.create({
            data: {
              id: `like-${p}-${k}`,
              postId: `post-${p}`,
              userId: people[(p + k) % 15][0],
            },
          });
      }
      for (let i = 0; i < 15; i++)
        for (let k = 1; k <= 5; k++)
          await prisma.follow.create({
            data: {
              id: `follow-${i}-${k}`,
              followerId: people[i][0],
              followingId: people[(i + k) % 15][0],
              createdAt: ago(10000 + i * 60),
            },
          });
      // Twenty genuine conversations, including two-account access-control fixtures.
      const pairs: [number, number][] = [
        [0, 1],
        [2, 3],
        [0, 3],
        [0, 2],
        [0, 7],
        [0, 8],
        [0, 10],
        [1, 3],
        [1, 5],
        [2, 4],
        [2, 6],
        [3, 5],
        [4, 14],
        [5, 9],
        [6, 13],
        [7, 11],
        [8, 14],
        [9, 10],
        [10, 12],
        [11, 13],
      ];
      for (let i = 0; i < pairs.length; i++) {
        const [a, b] = pairs[i];
        const conversationId = `convo-${i + 1}`;
        await prisma.conversation.create({
          data: {
            id: conversationId,
            title: "",
            createdAt: ago(2000 + i * 60),
            participants: {
              create: [
                {
                  id: `participant-${i + 1}-a`,
                  userId: people[a][0],
                  lastReadAt: ago(i % 3 === 0 ? 300 : 1),
                },
                {
                  id: `participant-${i + 1}-b`,
                  userId: people[b][0],
                  lastReadAt: ago(1),
                },
              ],
            },
          },
        });
        const lines =
          i === 0
            ? [
                "Is this chat private?",
                "Obviously.",
                "Then why is some random cybersecurity scanner reading it?",
              ]
            : i === 1
              ? [
                  "Did you book the table for Saturday?",
                  "Yes! Seven o’clock. I’ll send you the address.",
                  "Perfect. Looking forward to a proper catch-up.",
                ]
              : [
                  [
                    "Hey! How is your week going?",
                    "Pretty good. Finally making time for a slow weekend.",
                    "Want to grab coffee sometime?",
                  ],
                  [
                    "Just sent you the photos from last weekend.",
                    "These turned out so well! Thank you.",
                    "We should plan another trip soon.",
                  ],
                  [
                    "Are you still up for lunch tomorrow?",
                    "Absolutely. How does the place near the park sound?",
                    "Perfect, see you at noon!",
                  ],
                  [
                    "Found something I thought you would like.",
                    "You know me too well. Adding it to the list.",
                    "Let me know what you think!",
                  ],
                ][i % 4];
        for (let m = 0; m < lines.length; m++)
          await prisma.message.create({
            data: {
              id: `message-${i + 1}-${m + 1}`,
              conversationId,
              senderId: people[m % 2 === 0 ? a : b][0],
              content: lines[m],
              createdAt: ago(100 + i * 11 - m * 3),
            },
          });
      }
      for (let i = 0; i < 15; i++) {
        const id = `album-${i + 1}`;
        const privateAlbum = i < 10;
        await prisma.photoAlbum.create({
          data: {
            id,
            ownerId: people[i][0],
            name:
              i === 0
                ? "Evidence I was productive today"
                : [
                    "Weekend little things",
                    "Places to remember",
                    "Good company",
                    "A few favorites",
                    "Out of office",
                    "Slow mornings",
                    "From the camera roll",
                  ][i % 7],
            isPrivate: privateAlbum,
            createdAt: ago(8000 + i * 400),
          },
        });
        const number = i === 0 ? 4 : 3;
        for (let p = 0; p < number; p++) {
          const photoIndex = i === 0 ? p + 1 : i * 3 + p + 2;
          const filename =
            i === 0
              ? p < 3
                ? `cat-${p + 1}.svg`
                : "todo.svg"
              : `scene-${((i + p) % 8) + 1}.svg`;
          const photoId = `photo-${photoIndex}`;
          await prisma.photo.create({
            data: {
              id: photoId,
              ownerId: people[i][0],
              albumId: id,
              url: privateAlbum
                ? `/api/photos/${photoId}`
                : `/media/${filename}`,
              filename,
              mimeType: "image/svg+xml",
              isPrivate: privateAlbum,
              caption:
                i === 0
                  ? p < 3
                    ? [
                        "Quality control supervisor",
                        "Head of afternoon naps",
                        "Director of doing absolutely nothing",
                      ][p]
                    : "To-do list. Progress: aesthetically pleasing."
                  : [
                      "A good afternoon",
                      "The scenic route",
                      "A moment worth keeping",
                    ][p],
              createdAt: ago(7900 + i * 400 + p * 20),
            },
          });
        }
      }
      for (let i = 0; i < 45; i++) {
        const target = people[i % 15];
        const actor = people[(i + 3) % 15];
        const type = ["LIKE", "COMMENT", "FOLLOW"][i % 3];
        await prisma.notification.create({
          data: {
            id: `notification-${i + 1}`,
            userId: target[0],
            type,
            content:
              type === "LIKE"
                ? `${actor[2]} liked your post`
                : type === "COMMENT"
                  ? `${actor[2]} replied to your post`
                  : `${actor[2]} started following you`,
            href: `/u/${actor[1]}`,
            read: i % 4 === 0,
            createdAt: ago(15 + i * 35),
          },
        });
      }
    },
    { timeout: 120000 },
  );
  await seedFixtures();
  console.log(
    "Seed restored: 16 fictional users, 71 posts, 120 comments, 20 conversations, 15 albums (10 private), 45 notifications.",
  );
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
