import { IsInt, Min } from "class-validator";
import { Column, Entity, Index } from "typeorm";
import { ApplicationEntity } from "./application_entity";
import { TransportDatabaseLabel } from "@/common/transport/TransportDatabaseLabel";

/** The color of one database of a saved connection; one row per connection, workspace and database */
@Entity({ name: 'database_labels' })
@Index('database_labels_connection_database', ['connectionId', 'workspaceId', 'databaseName'], { unique: true })
export class DatabaseLabel extends ApplicationEntity {
  withProps(input: Partial<TransportDatabaseLabel>): DatabaseLabel {
    if (input) DatabaseLabel.merge(this, input as any);
    return this;
  }

  @IsInt({ message: 'connectionId must be a saved connection id' })
  @Min(1, { message: 'connectionId must be a saved connection id' })
  @Column({ type: 'integer', nullable: false })
  connectionId: number

  @Column({ type: 'integer', nullable: false, default: -1 })
  workspaceId = -1

  @Column({ type: 'varchar', nullable: false })
  databaseName: string

  @Column({ type: 'varchar', nullable: false })
  color: string

  /** Insert or update the color of one database */
  static async setColor(input: Pick<TransportDatabaseLabel, 'connectionId' | 'workspaceId' | 'databaseName' | 'color'>): Promise<DatabaseLabel> {
    const { connectionId, workspaceId, databaseName, color } = input;
    const label = await DatabaseLabel.findOneBy({ connectionId, workspaceId, databaseName })
      ?? new DatabaseLabel().withProps({ connectionId, workspaceId, databaseName });
    label.color = color;
    await label.save();
    return label;
  }
}
