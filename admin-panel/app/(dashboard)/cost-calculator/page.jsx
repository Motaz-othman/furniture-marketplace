'use client';

import { useState, useMemo } from 'react';
import { Calculator } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function getOverweightCost(weight) {
  if (weight <= 300) return 0;
  if (weight <= 400) return 110;
  if (weight <= 500) return 235;
  if (weight <= 600) return 285;
  if (weight <= 700) return 335;
  // >700: $110 per 100 lbs
  const extraHundreds = Math.ceil((weight - 700) / 100);
  return 335 + extraHundreds * 110;
}

function getOversizeCost(width) {
  if (width <= 100) return 0;
  return 110;
}

export default function CostCalculatorPage() {
  const [unitCost, setUnitCost] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [weight, setWeight] = useState('');
  const [width, setWidth] = useState('');
  const [flatRate, setFlatRate] = useState('180');
  const [fuelCharge, setFuelCharge] = useState('30');
  const [markup, setMarkup] = useState('');
  const [marketingPct, setMarketingPct] = useState('25');
  const [monthlyFixed, setMonthlyFixed] = useState('450');
  const [monthlyOrders, setMonthlyOrders] = useState('');
  const [paymentPct, setPaymentPct] = useState('3.4');
  const [returnPct, setReturnPct] = useState('10');
  const [damagePct, setDamagePct] = useState('3');

  const calculation = useMemo(() => {
    const costVal = parseFloat(unitCost) || 0;
    const weightVal = parseFloat(weight) || 0;
    const widthVal = parseFloat(width) || 0;
    const flatRateVal = parseFloat(flatRate) || 0;
    const fuelPct = parseFloat(fuelCharge) || 0;
    const markupPct = parseFloat(markup) || 0;
    const mktPct = parseFloat(marketingPct) || 0;

    const overweightCost = getOverweightCost(weightVal);
    const oversizeCost = getOversizeCost(widthVal);
    const deliveryWithFuel = flatRateVal * (1 + fuelPct / 100);
    const markupAmount = costVal * (markupPct / 100);
    const deliveryTotal = deliveryWithFuel + overweightCost + oversizeCost + markupAmount;
    const marketingAmount = costVal * (mktPct / 100);
    const fixedVal = parseFloat(monthlyFixed) || 0;
    const ordersVal = parseFloat(monthlyOrders) || 0;
    const payPct = parseFloat(paymentPct) || 0;

    const platformFixed = ordersVal > 0 ? fixedVal / ordersVal : 0;
    const subtotalBeforePlatform = costVal + deliveryTotal + marketingAmount;
    const paymentFee = subtotalBeforePlatform * (payPct / 100) + (ordersVal > 0 ? 0.30 : 0);
    const platformTotal = platformFixed + paymentFee;

    const retPct = parseFloat(returnPct) || 0;
    const dmgPct = parseFloat(damagePct) || 0;
    const returnAmount = costVal * (retPct / 100);
    const damageAmount = costVal * (dmgPct / 100);
    const riskTotal = returnAmount + damageAmount;

    const totalCost = subtotalBeforePlatform + platformTotal + riskTotal;

    return {
      overweightCost,
      oversizeCost,
      deliveryWithFuel,
      markupAmount,
      deliveryTotal,
      marketingAmount,
      platformFixed,
      paymentFee,
      platformTotal,
      returnAmount,
      damageAmount,
      riskTotal,
      totalCost,
    };
  }, [unitCost, weight, width, flatRate, fuelCharge, markup, marketingPct, monthlyFixed, monthlyOrders, paymentPct, returnPct, damagePct]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Calculator className="h-6 w-6" />
          Cost Calculator
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Calculate the final landed cost for a product including delivery, fuel, weight, and size surcharges.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4 max-w-lg">
            <div className="space-y-2">
              <Label htmlFor="unitCost">Cost Price ($)</Label>
              <Input
                id="unitCost"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sellingPrice">Selling Price ($)</Label>
              <Input
                id="sellingPrice"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="border-l-4 border-primary pl-3">
            <p className="text-base font-semibold">Delivery Cost</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Flat rate + fuel surcharge + weight &amp; size surcharges
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight">Unit Weight (lbs)</Label>
              <Input
                id="weight"
                type="number"
                min="0"
                placeholder="0"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
              {calculation.overweightCost > 0 && (
                <p className="text-xs text-orange-600">+${calculation.overweightCost}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="width">Unit Width (in)</Label>
              <Input
                id="width"
                type="number"
                min="0"
                placeholder="< 100"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
              />
              {calculation.oversizeCost > 0 && (
                <p className="text-xs text-orange-600">+$110</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="flatRate">Flat Rate ($)</Label>
              <Input
                id="flatRate"
                type="number"
                min="0"
                step="0.01"
                placeholder="180"
                value={flatRate}
                onChange={(e) => setFlatRate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fuelCharge">Fuel Charge (%)</Label>
              <Input
                id="fuelCharge"
                type="number"
                min="0"
                max="100"
                placeholder="30"
                value={fuelCharge}
                onChange={(e) => setFuelCharge(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="markup">Additional Markup (%)</Label>
              <Input
                id="markup"
                type="number"
                min="0"
                placeholder="0"
                value={markup}
                onChange={(e) => setMarkup(e.target.value)}
              />
              {calculation.markupAmount > 0 && (
                <p className="text-xs text-orange-600">+${calculation.markupAmount.toFixed(2)}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Marketing Cost */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="border-l-4 border-primary pl-3">
            <p className="text-base font-semibold">Marketing Cost</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Percentage of cost price allocated to customer acquisition
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="marketingPct">Marketing (%)</Label>
              <Input
                id="marketingPct"
                type="number"
                min="0"
                max="100"
                placeholder="25"
                value={marketingPct}
                onChange={(e) => setMarketingPct(e.target.value)}
              />
              {calculation.marketingAmount > 0 && (
                <p className="text-xs text-orange-600">+${calculation.marketingAmount.toFixed(2)}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Platform Cost */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="border-l-4 border-primary pl-3">
            <p className="text-base font-semibold">Platform Cost</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Hosting, infrastructure &amp; payment processing per item
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monthlyFixed">Monthly Fixed Costs ($)</Label>
              <Input
                id="monthlyFixed"
                type="number"
                min="0"
                step="1"
                placeholder="450"
                value={monthlyFixed}
                onChange={(e) => setMonthlyFixed(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Vercel + AWS + Wondersign</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthlyOrders">Expected Orders/Month</Label>
              <Input
                id="monthlyOrders"
                type="number"
                min="0"
                placeholder="0"
                value={monthlyOrders}
                onChange={(e) => setMonthlyOrders(e.target.value)}
              />
              {calculation.platformFixed > 0 && (
                <p className="text-xs text-orange-600">${calculation.platformFixed.toFixed(2)}/item</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentPct">Payment + Tax (%)</Label>
              <Input
                id="paymentPct"
                type="number"
                min="0"
                step="0.1"
                placeholder="3.4"
                value={paymentPct}
                onChange={(e) => setPaymentPct(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Stripe 2.9% + Tax 0.5%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Cost */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="border-l-4 border-primary pl-3">
            <p className="text-base font-semibold">Risk Cost</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Returns, damage in transit &amp; chargebacks as % of cost price
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="returnPct">Returns (%)</Label>
              <Input
                id="returnPct"
                type="number"
                min="0"
                max="100"
                placeholder="10"
                value={returnPct}
                onChange={(e) => setReturnPct(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Avg furniture: 8–12%</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="damagePct">Damage &amp; Chargebacks (%)</Label>
              <Input
                id="damagePct"
                type="number"
                min="0"
                max="100"
                placeholder="3"
                value={damagePct}
                onChange={(e) => setDamagePct(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Transit damage + fraud</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {/* Header */}
            <div className="grid grid-cols-3 px-3 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <span>Cost Type</span>
              <span className="text-right">Amount</span>
              <span className="text-right">% of Cost Price</span>
            </div>

            {[
              { label: 'Delivery Cost', amount: calculation.deliveryTotal },
              { label: 'Marketing Cost', amount: calculation.marketingAmount },
              { label: 'Platform Cost', amount: calculation.platformTotal },
              { label: 'Risk Cost', amount: calculation.riskTotal },
            ].map(({ label, amount }) => (
              <div key={label} className="grid grid-cols-3 items-center p-3 rounded-md bg-muted/50">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-right text-lg font-semibold">${amount.toFixed(2)}</span>
                <span className="text-right text-sm text-muted-foreground">
                  {(parseFloat(unitCost) || 0) > 0
                    ? `+${((amount / (parseFloat(unitCost) || 1)) * 100).toFixed(1)}%`
                    : '—'}
                </span>
              </div>
            ))}

            <div className="grid grid-cols-3 items-center p-4 rounded-md bg-primary/10 border border-primary/20">
              <span className="text-base font-medium">Total Cost</span>
              <span className="text-right text-2xl font-bold">${calculation.totalCost.toFixed(2)}</span>
              <span className="text-right text-base font-semibold">
                {(parseFloat(unitCost) || 0) > 0
                  ? `+${(((calculation.totalCost - (parseFloat(unitCost) || 0)) / (parseFloat(unitCost) || 1)) * 100).toFixed(1)}%`
                  : '—'}
              </span>
            </div>

            {(parseFloat(sellingPrice) || 0) > 0 && (() => {
              const sell = parseFloat(sellingPrice) || 0;
              const profit = sell - calculation.totalCost;
              const marginPct = (profit / sell) * 100;
              const isPositive = profit >= 0;
              return (
                <div className={`grid grid-cols-3 items-center p-4 rounded-md border ${isPositive ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900' : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900'}`}>
                  <span className="text-base font-medium">Clean Profit</span>
                  <span className={`text-right text-2xl font-bold ${isPositive ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                    ${profit.toFixed(2)}
                  </span>
                  <span className={`text-right text-base font-semibold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {marginPct.toFixed(1)}% margin
                  </span>
                </div>
              );
            })()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
