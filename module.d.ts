declare module "module" {
  global {
    namespace NodeJS {
      interface Require {
        <T>(id: string): T;
      }
    }
  }
}
