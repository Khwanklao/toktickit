const { execSync } = require("child_process");

const testDbUrl =
  process.env.DATABASE_URL ||
  "postgresql://toktickit:toktickit@localhost:5432/toktickit_test?schema=public";

console.log(`Seeding test database at: ${testDbUrl}`);

execSync("npm --prefix server run prisma:seed", {
  stdio: "inherit",
  env: {
    ...process.env,
    DATABASE_URL: testDbUrl,
  },
});
