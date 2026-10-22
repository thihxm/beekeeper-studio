export default {
  name: "20261021_add_tab_target_connection_id",
  async run(runner) {
    // NULL keeps the old meaning: the tab runs on the window's connection
    const query = `ALTER TABLE tabs ADD COLUMN "targetConnectionId" integer NULL`;
    await runner.query(query);
  }
}
