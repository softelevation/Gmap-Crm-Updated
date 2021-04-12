import fetch from 'node-fetch'
import { orderByDistance } from 'geolib'
import { compact, filter } from 'lodash'
import states from './state_hash'
import { PositionType, SearchAddressType, SearchParametersType } from '../types'
import { ZOHO } from '../vendor/ZSDK'

type AddressGeocodeType = {
    searchAddress: SearchAddressType
    apiKey: string
}

type RecordType = {
    id: string
    Availability: string
    Base_Rate: number
    Current_Status: string
    Phone: string | null
    Name: string
    Street: string
    City: string
    State: string
    Zip: string
    Country: string
    Latitude: string
    Longitude: string
}

export async function findMatchingProperties ({ searchAddress }: SearchParametersType) {
    const response = await ZOHO.CRM.FUNCTIONS.execute('find_nearby_contacts', {
        arguments: JSON.stringify({
            search_address: searchAddress,
            radius_km: 999.0
        })
    })

    return response
}

export async function getGoogleMapsApiKeyFromCRM (crm_variable = 'googleMapsApiKey2') {
    await ZOHO.embeddedApp.init()
    const googleMapsAPIKey = await ZOHO.CRM.API.getOrgVariable(crm_variable)
    if (Object.keys(googleMapsAPIKey).includes('Error')) {
        alert(`Issue with google maps API organisation variable: ${googleMapsAPIKey.Error.Content}. Make sure you've added the key.`)
    }
    return googleMapsAPIKey.Success.Content
}

export async function getRecords (page: number) {
    await ZOHO.embeddedApp.init()
    let pageNum = page
    let more = true
    const dataArr = []
    while (more) {
        const response = await ZOHO.CRM.API.getAllRecords({
            Entity: 'Mold_Test_Inspector',
            page: pageNum,
            per_page: 200
        })
        const data = response.data.map((item: RecordType) => {
            const { Availability, Base_Rate, Current_Status, Street, City, State, Zip, Latitude, Longitude } = item
            if (Street && City && State && Latitude && Longitude && Current_Status.toLowerCase() !== 'inactive') {
                return {
                    Availability,
                    Base_Rate,
                    Street,
                    City,
                    State,
                    Zip,
                    address: `${Street}, ${City}, ${State}${Zip ? `, ${Zip}` : ''}`,
                    position: {
                        latitude: parseFloat(Latitude),
                        longitude: parseFloat(Longitude)
                    },
                    latitude: parseFloat(Latitude),
                    longitude: parseFloat(Longitude),
                    id: item.id,
                    phoneNumber: item.Phone,
                    name: item.Name
                }
            }
        })
        more = response.info.more_records
        pageNum++
        dataArr.push(...data)
    }
    return compact(dataArr)
}

export async function filterRecordsByDistance (coordinates: PositionType, records: PositionType[]) {
    const sortedRecordsByDistance = orderByDistance(
        coordinates,
        records
    )
    return sortedRecordsByDistance.slice(0, 25)
}

export async function filterRecordsByState (state: keyof typeof states) {
    const records = localStorage.getItem('cachedLeads')
    const stateName = states[state]
    if (records && stateName) {
        const recordsParsed = JSON.parse(records)
        const filteredRecords = filter(recordsParsed, (record: RecordType) => {
            return record.State?.toLowerCase() === stateName?.toLowerCase() || record.State?.toLowerCase() === state?.toLowerCase()
        })
        return filteredRecords
    } else {
        alert(!stateName ? 'Invalid State!' : 'No records found!')
    }
}

export async function getAddressGeocode ({ searchAddress, apiKey }: AddressGeocodeType) {
    const address = `${searchAddress.Street}, ${searchAddress.City}, ${searchAddress.State}${searchAddress.Zip ? `, ${searchAddress.Zip}` : ''}`
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${apiKey}`
	const res = await fetch(url)
    const body = await res.json()
		
	if (body.results.length > 0) {
		const coordinates = {
            latitude: body.results[0].geometry.location.lat,
            longitude: body.results[0].geometry.location.lng
        }
        return {
            coordinates,
            status: 'Success',
			geo_response_status: body.status
        }
    }
    return {
        msg: 'Unable to fetch coordinates.',
        status: 'Failed',
		geo_response_status: body.status
    }
}
