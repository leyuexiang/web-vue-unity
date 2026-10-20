export {}

declare global {
namespace AccountApi {
  interface CommonResponse<T> {
    code: number;
    data: T;
    msg: string;
  }

  interface CommonResponse2<T> {
    code: number;
    content: T;
    msg: string;
  }

  interface MenuItem {
    id: number;
    parentId: number;
    name: string;
    path: string;
    component: null;
    componentName: null;
    icon: string;
    visible: boolean;
    keepAlive: boolean;
    alwaysShow: boolean;
    children: null;
  }

  type getDetailOfAccountResponse = CommonResponse<{
    menus: MenuItem[];
    permissions: string[];
    roles: string[];
    user: {
      id: number;
      deptId: number;
      nickname: string;
      avatar: string;
    };
  }>;

  type getLogoutResponse = CommonResponse<boolean>;

  type getRefreshTokenResponse = CommonResponse<{
    /*用户编号 */
    userId: number;

    /*访问令牌 */
    accessToken: string;

    /*刷新令牌 */
    refreshToken: string;

    /*过期时间 */
    expiresTime: number;
  }>;
}
}
