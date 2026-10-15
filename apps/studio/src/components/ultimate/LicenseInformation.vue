<template>
  <div class="license-information card card-flat padding">
    <h3 class="card-title flex flex-middle">
      <span class="expand">{{ license.email }}</span>
      <a v-if="!licenseStatus.fromFile" @click.prevent="destroy" class="btn btn-danger btn-icon"><i class="material-icons">delete_outline</i><span>Remove from app</span></a>
    </h3>
    <div class="card-body">
      <table class="simple-table">
        <tr>
          <td>License Type <a href="https://docs.beekeeperstudio.io/">learn more</a></td>
          <td>{{ licenseStatus.fromFile ? "Offline File License" : "Online License" }}</td>
        </tr>
        <template v-if="licenseStatus.fromFile">
          <tr>
            <td>File Path</td>
            <td>{{ licenseStatus.filePath }}</td>
          </tr>
        </template>
        <tr>
          <td>Status</td>
          <td>{{ status }}</td>
        </tr>
        <tr>
          <td>Subscription Until</td>
          <td>{{ license.supportUntil.toLocaleDateString() }}</td>
        </tr>
      </table>
    </div>
  </div>
</template>
<style scoped>
table.simple-table {
  width: 100%;
  border-collapse: collapse;
}

table.simple-table th,
table.simple-table td {
  padding: 0.25rem;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

table.simple-table tr:nth-child(odd) {
  background-color: rgba(0, 0, 0, 0.025);
  /* Light darkening for odd rows */
}

table.simple-table td:nth-child(2) {
  text-align: right;
}

table.simple-table th {
  text-align: left;
}
</style>
<script lang="js">
export default {
  props: ['license', 'licenseStatus'],
  computed: {
    status() {
      if (this.licenseStatus.canAccessCloudWorkspaces) return "Active, Cloud Workspaces available"
      return "Inactive, Cloud Workspaces need an active subscription"
    }
  },
  methods: {
    async destroy() {
      await this.$store.dispatch('licenses/remove', this.license)
    }
  }

}
</script>
