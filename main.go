package main

import (
	"os"

	"github.com/consensys/gnark-crypto/ecc"
	"github.com/consensys/gnark/frontend"

	"github.com/PolyhedraZK/ExpanderCompilerCollection/ecgo"
	"github.com/PolyhedraZK/ExpanderCompilerCollection/ecgo/test"
)

type Circuit struct {
	X frontend.Variable
	Y frontend.Variable
}

func (circuit *Circuit) Define(api frontend.API) error {
	api.AssertIsEqual(circuit.X, circuit.Y)
	return nil
}

func main() {
	assignment := &Circuit{X: 1, Y: 1}

	circuit, _ := ecgo.Compile(ecc.BN254.ScalarField(), &Circuit{})
	c := circuit.GetLayeredCircuit()
	os.WriteFile("circuit.txt", c.Serialize(), 0o644)
	inputSolver := circuit.GetInputSolver()
	witness, _ := inputSolver.SolveInputAuto(assignment)
	os.WriteFile("witness.txt", witness.Serialize(), 0o644)
	if !test.CheckCircuit(c, witness) {
		panic("verification failed")
	}
}
