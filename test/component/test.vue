import _ from 'lodash';
import { mapGetters, mapActions, mapMutations } from 'vuex';
import userTypes from '../../vuex/types/user';

/**
 * @vue
 * @exports component/page/home
 */
export default {
  props: {
    testA: Number,
    testB: {
      type: String,
      required: false,
      default: function() {
        return {};
      },
      validator: function(value) {

      }
    },
    testC: {
      type: function(value) {
        return value instanceof Number;
      },
      default: 'test'
    }
  },
  name: 'Home',
  components: {
    App,
  },
  data() {
    return {
      filter: '',
      isLoading: false,
    }
  },
  computed: {
    filterUsers() {
      if (this.filter.trim() == '') return this.userList;
      return this.userList.filter(user => {
        return user.name.indexOf(this.filter.trim()) != -1;
      })
    },
    ...mapGetters({
      userList: userTypes.USER_LIST
    })
  },
  created() {
    this.$emit('update:foo', this.isFoled);
  },
  methods: {
    ...mapActions({
      userAdd: userTypes.USER_ADD,
      userDelete: userTypes.USER_DELETE
    }),
    // 跳过action，直接使用mutation
    ...mapMutations({
      userShuffle:userTypes.USER_SHUFFLE
    }),
    addNewUser() {
      let str = 'abcdefghijklmnopqrstuvwxyz012345678ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      let id = Math.round(Math.random() * 1000000000)
      let name = new Array(8).fill(1).map((item, index) => {
        return str[Math.round(Math.random() * (str.length - 1))];
      }).join('');

      this.isLoading = true
      this.userAdd({id, name})
        .then(data => {
          this.isLoading = false
        })
    },
  },
  mounted() {
    console.log('home ...')
  }
}
