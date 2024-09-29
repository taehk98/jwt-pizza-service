const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;
let registerRes;
let adminUser;
let adminUserAuthToken;

async function createAdminUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name =  "exampleName";
  user.email = user.name + '@admin.com';

  user = await DB.addUser(user);

  user.password = 'toomanysecrets';

  return user;
}

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;

  adminUser = await createAdminUser();

  await request(app).put(`/api/auth/${adminUser.id}`).send({ email: adminUser.email, password: 'toomanysecrets' });

  registerRes = await request(app).put('/api/auth').send({ email: adminUser.email, password: adminUser.password });
  adminUserAuthToken = registerRes.body.token;
});

test('get franchise', async () => {
  const getRes = await request(app).get('/api/franchise').set('authorization', `Bearer ${testUserAuthToken}`);
  
  expect(getRes.status).toBe(200);
  expect(getRes.body.length).toBe(0);
});

test('create and delete franchise', async () => {
  const payload = { name: "testFranchise", admins: [adminUser], id: 1 };

  const invalidCreateRes = await request(app)
    .post('/api/franchise')
    .set('authorization', `Bearer ${testUserAuthToken}`)
    .send(payload);
  
  expect(invalidCreateRes.status).toBe(403);

  const createRes = await request(app)
    .post('/api/franchise')
    .set('authorization', `Bearer ${adminUserAuthToken}`)
    .send(payload);
    

  expect(createRes.status).toBe(200);
  expect(createRes.body.name).toBe("testFranchise");

  const deleteRes = await request(app)
    .delete(`/api/franchise/${createRes.body.id}`)
    .set('authorization', `Bearer ${adminUserAuthToken}`);

  expect(deleteRes.status).toBe(200);
  expect(deleteRes.body.message).toBe('franchise deleted');
});

test('create multiple franchises and get franchises', async () => {
  const payload = { name: "testFranchise", admins: [adminUser], id: 1 };

  const createRes = await request(app)
    .post('/api/franchise')
    .set('authorization', `Bearer ${adminUserAuthToken}`)
    .send(payload);

  const payload2 = { name: "testFranchise2", admins: [adminUser], id: 2 };
  const createRes2 = await request(app)
    .post('/api/franchise')
    .set('authorization', `Bearer ${adminUserAuthToken}`)
    .send(payload2);
  
  const getRes = await request(app)
    .get(`/api/franchise/${adminUser.id}`)
    .set('authorization', `Bearer ${adminUserAuthToken}`);

  expect(getRes.status).toBe(200);
  expect(getRes.body.length).toBe(2);

  await request(app)
    .delete(`/api/franchise/${createRes.body.id}`)
    .set('authorization', `Bearer ${adminUserAuthToken}`);

  await request(app)
    .delete(`/api/franchise/${createRes2.body.id}`)
    .set('authorization', `Bearer ${adminUserAuthToken}`);
});

test('create and delete store', async () => {
  const payload = { name: "testFranchise3", admins: [adminUser], id: 1 };

  const createRes = await request(app)
    .post('/api/franchise')
    .set('authorization', `Bearer ${adminUserAuthToken}`)
    .send(payload);
  
  console.log(createRes.body);

  const invalidCreateStoreRes = await request(app)
    .post(`/api/franchise/${createRes.body.id}/store`)
    .set('authorization', `Bearer ${testUserAuthToken}`)
    .send({ name: "testStore" });
  
  expect(invalidCreateStoreRes.status).toBe(403);
  
  const storePayload = { name: "testStore" };
  const createStoreRes = await request(app)
    .post(`/api/franchise/${createRes.body.id}/store`)
    .set('authorization', `Bearer ${adminUserAuthToken}`)
    .send(storePayload);

  console.log(createStoreRes.body);
  expect(createStoreRes.status).toBe(200);

  const invalidDeleteStoreRes = await request(app)
    .delete(`/api/franchise/${createRes.body.id}/store/1`)
    .set('authorization', `Bearer ${testUserAuthToken}`);
  
  expect(invalidDeleteStoreRes.status).toBe(403);

  const deleteStoreRes = await request(app)
    .delete(`/api/franchise/${createRes.body.id}/store/${createStoreRes.body.id}`)
    .set('authorization', `Bearer ${adminUserAuthToken}`);
  expect(deleteStoreRes.status).toBe(200);
  console.log(deleteStoreRes.body);
});
