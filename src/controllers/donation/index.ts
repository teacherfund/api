import {BaseContext} from 'koa'
import * as Strings from '../../helpers/strings'
import * as donationController from './donation'
import * as userController from '../user/user'
import {Donation} from '../../@types/donation'
import {User} from '../../@types/user'
import user from '../../models/user';
const config = require('../../../config')
const stripe = require('stripe')(config.stripe.secretKey)
stripe.setApiVersion(config.stripe.apiVersion)

export default class DonationController {
  public static async createDonation(ctx: BaseContext) {
    const { email, amount, frequency, source, meta } = ctx.request.body
    ctx.assert(amount, 400, Strings.AmountIsRequired)
    ctx.assert(frequency, 400, Strings.FrequencyIsRequired)

    // If one time donation
    let userId = 0
    let errorMessage = ''
    let stripeStatus
    if (frequency === 'once') {
      const createUserBody: userController.CreateUserBody = {
        email,
        firstName: ctx.request.body.firstName,
        lastName: ctx.request.body.lastName,
      }
      
      // create a user
      const user: User = await userController.createNewUser(createUserBody)
      userId = user.id

      // create a charge 
      // Create a stripe charge for the order 
      let {status, failure_message} = await stripe.charges.create({
        amount,
        currency: 'usd',
        description: 'Donation',
        source: source.id,
        metadata: meta,
        receipt_email: email
      })
      errorMessage = failure_message
      stripeStatus = status
    }

    if (frequency === 'month') {

    // if recurring - make them create an account? do we have passwords? talk to pete
    // redirect to sign in page with amount of donation in URL so we dont need redux 

    // create an account in backend

    // create a customer in stripe from this account info 

    // create the plan according to how much they want to monthly donate 

    // create a subscription with the plan ID and the customer ID 
    }

    const createDonationBody: donationController.CreateDonationBody = {
      userId,
      date: new Date(),
      amount,
      frequency
    }

    const donation: Donation = await donationController.createNewDonation(createDonationBody)

    ctx.status = 200
    ctx.body = { ok: true, donation, status: stripeStatus, message: errorMessage }
  }

  public async getDonation(ctx: BaseContext) {
    const { id } = ctx.request.body
    ctx.assert(id, 400, Strings.DonationIdIsRequired)

    const donation: Donation = await donationController.getDonation(id)

    ctx.status = 200
    ctx.body = { ok: true, donation }
  }

  public async getAllDonations(ctx: BaseContext) {
    const donations: Donation[] = await donationController.getAllDonations()
    ctx.status = 200
    ctx.body = { ok: true, donations }
  }

  public async updateDonation(ctx: BaseContext) {
    const { id } = ctx.request.body
    ctx.assert(id, 400, Strings.DonationIdIsRequired)

    const updateDonationBody: donationController.UpdateDonationBody = {
      frequency: ctx.request.body.frequency,
      id: ctx.request.body.id,
      amount: ctx.request.body.amount
    }

    const donation: Donation = await donationController.updateDonation(updateDonationBody)

    ctx.status = 200
    ctx.body = { ok: true, donation }
  }

  public async deleteDonation(ctx: BaseContext) {
    const { id } = ctx.request.body
    ctx.assert(id, 400, Strings.DonationIdIsRequired)

    await donationController.deleteDonation(id)

    ctx.status = 200
    ctx.body = { ok: true }
  }
}