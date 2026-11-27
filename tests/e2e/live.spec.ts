import { test,expect } from '@playwright/test';
import { api,base } from '../environment';
test('real public catalog and detail match Spring Boot',async({page,request})=>{
 const response=await request.get(api+'/api/hotels');expect(response.ok()).toBe(true);const hotels=await response.json() as {id:number;name:string}[];
 await page.goto(base);await expect(page.locator('.hotel-card')).toHaveCount(hotels.length);
 if(hotels.length){await page.goto(base+'hoteles/'+hotels[0].id);await expect(page.locator('.hero-title')).toHaveText(hotels[0].name);await expect(page.locator('.editorial-room-card')).toHaveCount((await (await request.get(api+'/api/hotels/'+hotels[0].id)).json()).roomTypes.length);}
});
