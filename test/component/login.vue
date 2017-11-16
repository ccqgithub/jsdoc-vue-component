import api from '../lib/api';
import {getUrl} from '../lib/site';

/**
 * @vue
 * @exports component/login
 */
export default {
  name: 'Login',
  data: () => {
    return {
      username: '',
      password: '',
    };
  },
  methods: {
    submit() {
      if (!this.username.trim() || !this.password.trim()) {
        alert('请填写用户名密码！');
        return;
      }

      api.postForm('api/auth/login', {
        username: this.username.trim(),
        password: this.password.trim()
      }).then(data => {
        alert ('登录成功');
        location.href = getUrl('/app/');
      }).catch(error => {
        alert(error.message);
      });
    }
  }
}
