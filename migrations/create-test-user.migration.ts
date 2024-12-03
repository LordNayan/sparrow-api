import { Injectable, OnModuleInit, Inject } from "@nestjs/common";
import { Collections } from "@src/modules/common/enum/database.collection.enum";
import { TeamRole } from "@src/modules/common/enum/roles.enum";
import { createHmac } from "crypto";
import { Db } from "mongodb";

@Injectable()
export class CreateUserMigration implements OnModuleInit {
  constructor(
    @Inject("DATABASE_CONNECTION") private readonly db: Db, // Inject the MongoDB connection
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      const usersCollection = this.db.collection(Collections.USER);
      const teamsCollection = this.db.collection(Collections.TEAM);

      // Define the user to be added
      const newUser = {
        email: "test_dev@gmail.com",
        name: "dev",
        password: createHmac("sha256", "12345678@").digest("hex"),
        isEmailVerified: true,
      };

      // Check if the user already exists
      const existingUser = await usersCollection.findOne({
        email: newUser.email,
      });
      if (existingUser) {
        console.log("User already exists. Skipping migration.");
        return;
      }

      // Insert the new user
      await usersCollection.insertOne(newUser);
      const team = {
        name: "Test Dev Team",
        description: "test dev team",
      };
      // Insert the new team
      const createdTeam = await teamsCollection.insertOne(team);

      // Find the inserted user
      const insertedUser = await usersCollection.findOne({
        email: newUser.email,
      });
      if (!insertedUser) {
        throw new Error("User not found after insertion.");
      }

      // Prepare updated user teams
      const updatedUserTeams = insertedUser.teams || [];
      updatedUserTeams.push({
        id: createdTeam.insertedId,
        name: team.name,
        role: TeamRole.OWNER, // Assuming "TeamRole.OWNER" is equivalent to the string "OWNER"
        isNewInvite: false,
      });

      // Update the user with the new team
      const updatedUserParams = {
        teams: updatedUserTeams,
      };

      await usersCollection.updateOne(
        { _id: insertedUser._id },
        { $set: updatedUserParams },
      );

      console.log("User created successfully:", newUser.email);
    } catch (error) {
      console.error("Error during migration:", error);
    }
  }
}
