import { Injectable, OnModuleInit, Inject } from "@nestjs/common";
import { Collections } from "@src/modules/common/enum/database.collection.enum";
import { TeamRole, WorkspaceRole } from "@src/modules/common/enum/roles.enum";
import {
  DefaultEnvironment,
  EnvironmentType,
} from "@src/modules/common/models/environment.model";
import { CreateEnvironmentDto } from "@src/modules/workspace/payloads/environment.payload";
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
      const workspaceCollection = this.db.collection(Collections.WORKSPACE);
      const environmentCollection = this.db.collection(Collections.ENVIRONMENT);

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
      const user = await usersCollection.insertOne(newUser);
      const team = {
        name: "Test Dev Team",
        description: "test dev team",
        users: [
          {
            id: user.insertedId.toString(),
            email: "test_dev@gmail.com",
            name: "dev",
            role: TeamRole.OWNER,
          },
        ],
      };
      // Insert the new team
      const createdTeam = await teamsCollection.insertOne(team);
      const teamData = await teamsCollection.findOne({
        _id: createdTeam.insertedId,
      });

      console.log(teamData);

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
        role: TeamRole.OWNER,
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

      // Create new global environment
      const createEnvironmentDto: CreateEnvironmentDto = {
        name: DefaultEnvironment.GLOBAL,
        variable: [
          {
            key: "",
            value: "",
            checked: true,
          },
        ],
      };
      const newEnvironment = {
        name: createEnvironmentDto.name,
        variable: createEnvironmentDto.variable,
        type: EnvironmentType.GLOBAL,
        createdBy: "dev",
        updatedBy: "dev",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const environment = await environmentCollection.insertOne(newEnvironment);

      const adminInfo = [];
      const usersInfo = [];
      for (const user of teamData.users) {
        if (user.role !== TeamRole.MEMBER) {
          adminInfo.push({
            id: user.id.toString(),
            name: user.name,
          });
          usersInfo.push({
            role: WorkspaceRole.ADMIN,
            id: user.id.toString(),
            name: user.name,
            email: user.email,
          });
        }
      }

      // Create new workspace
      const params = {
        name: "Test Workspace",
        team: {
          id: createdTeam.insertedId.toString(),
          name: "Test Dev Team",
        },
        users: usersInfo,
        admins: adminInfo,
        environments: [
          {
            id: environment.insertedId.toString(),
            name: createEnvironmentDto.name,
            type: EnvironmentType.GLOBAL,
          },
        ],
        createdAt: new Date(),
        createdBy: user.insertedId.toString(),
        updatedAt: new Date(),
        updatedBy: user.insertedId.toString(),
      };

      workspaceCollection.insertOne(params);

      console.log("User created successfully:", newUser.email);
    } catch (error) {
      console.error("Error during migration:", error);
    }
  }
}
