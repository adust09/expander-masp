import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Compliance() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Compliance Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p>
          Privacy Mixer is committed to maintaining the highest standards of compliance with all applicable laws and
          regulations. Our service is designed to enhance privacy in cryptocurrency transactions while adhering to legal
          requirements.
        </p>
        <h2 className="text-xl font-semibold">Key Compliance Points:</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            We do not store personal information or transaction details beyond what is necessary for the operation of
            our service.
          </li>
          <li>Our mixer is designed to prevent money laundering and other illicit activities.</li>
          <li>
            We cooperate with law enforcement agencies when required by law, while protecting user privacy to the extent
            possible.
          </li>
          <li>
            Users are responsible for ensuring their use of our service complies with their local laws and regulations.
          </li>
        </ul>
        <p>
          For more detailed information about our compliance policies or if you have any questions, please contact our
          compliance team at compliance@privacymixer.example.com.
        </p>
      </CardContent>
    </Card>
  )
}

