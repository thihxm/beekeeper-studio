export default {
  name: "20261015_add_tab_database_name",
  async run(runner) {
    // NULL keeps the old meaning: the tab follows the connection's default database
    const query = `ALTER TABLE tabs ADD COLUMN "databaseName" varchar NULL`;
    await runner.query(query);
  }
}
