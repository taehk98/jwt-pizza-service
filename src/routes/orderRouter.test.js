const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database');

const testUser = { name: 'pizza diner2', email: 'reg2@test.com', password: 'a' };
let testUserAuthToken;
let registerRes;
let adminUser;
let adminUserAuthToken;

async function createAdminUser() {
  let user = { password: 'toomanysecrets2', roles: [{ role: Role.Admin }] };
  user.name =  "exampleName2";
  user.email = user.name + '@admin2.com';

  user = await DB.addUser(user);

  user.password = 'toomanysecrets2';

  return user;
}

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;

  adminUser = await createAdminUser();

  await request(app).put(`/api/auth/${adminUser.id}`).send({ email: adminUser.email, password: 'toomanysecrets2' });

  registerRes = await request(app).put('/api/auth').send({ email: adminUser.email, password: adminUser.password });
  adminUserAuthToken = registerRes.body.token;
});


test('add menu item', async () => {
  const payLoad = { title: 'testItem', price: 10.00, image: 'testImage' , description: 'testDescription' };
  const addMenuItemRes = await request(app)
    .put('/api/order/menu')
    .set('authorization', `Bearer ${adminUserAuthToken}`)
    .send(payLoad);

  console.log(addMenuItemRes.body);
  expect(addMenuItemRes.status).toBe(200);
  expect(addMenuItemRes.body.length).toBe(1);

  const getRes = await request(app).get('/api/order').set('authorization', `Bearer ${testUserAuthToken}`);
  expect(getRes.status).toBe(200);
})