
// demo data
var treeData2 = {
  filename: "BIM360-Folder (Destination)",
};

// define the tree-item component
Vue.component("tree-item", {
  template: "#item-template",
  props: {
    item: Object
  },
  data: function() {
    return {
      isOpen: true
    };
  },
  computed: {
    isFolder: function() {
      return this.item.children && this.item.children.length;
    }
  },
  methods: {
    toggle1: function() {
      if (this.isFolder) {
        this.isOpen = !this.isOpen;
      } else {
        this.$emit("toggle1", this.item);
      }
    },
    makeFolder: function() {
      if (!this.isFolder) {
        this.$emit("make-folder", this.item);
        this.isOpen = true;
      }
    }
  }
});

